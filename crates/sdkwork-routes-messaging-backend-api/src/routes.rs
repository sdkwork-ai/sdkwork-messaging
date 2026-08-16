//! axum router and handlers for the messaging backend API.

use std::sync::Arc;

use axum::extract::{FromRequestParts, Path, Query, State};
use axum::http::request::Parts;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, put};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use sdkwork_utils_rust::uuid;
use sdkwork_web_core::WebRequestContext;

use crate::ports::{
    CreateNotificationCommand, CreateTemplateCommand, MessagingAdminStore, MessagingAdminSubject,
    PublishAnnouncementCommand, SendOutboundMessageCommand, SendPushMessageCommand,
    StoreError, UpdateChannelCommand, UpdateTemplateCommand, UpdateVerificationPolicyCommand,
};

#[derive(Clone)]
pub struct MessagingRouterState {
    pub store: Arc<dyn MessagingAdminStore + Send + Sync>,
}

// ------------------------------------------------------------------ subjects

impl<S: Send + Sync> FromRequestParts<S> for MessagingAdminSubject {
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let context = parts
            .extensions
            .get::<WebRequestContext>()
            .ok_or_else(|| problem_response(StatusCode::UNAUTHORIZED, "Unauthorized", "authenticated request context is required"))?;
        let tenant_id = context
            .tenant_id()
            .ok_or_else(|| problem_response(StatusCode::UNAUTHORIZED, "Unauthorized", "authenticated request context is missing tenant scope"))?
            .parse::<i64>()
            .map_err(|_| problem_response(StatusCode::UNAUTHORIZED, "Unauthorized", "tenant scope is not numeric"))?;
        let organization_id = context
            .organization_id()
            .and_then(|value| value.parse::<i64>().ok())
            .unwrap_or(0);
        let operator_id = context.user_id().and_then(|value| value.parse::<i64>().ok());
        Ok(MessagingAdminSubject {
            tenant_id,
            organization_id,
            operator_id,
        })
    }
}

// ------------------------------------------------------------------ envelope

pub fn success_response(status: StatusCode, data: Value) -> Response {
    let mut response = Json(json!({
        "code": 0,
        "data": data,
        "traceId": uuid(),
    }))
    .into_response();
    *response.status_mut() = status;
    response
}

pub fn problem_response(status: StatusCode, title: &str, detail: impl Into<String>) -> Response {
    let mut response = Json(json!({
        "type": "about:blank",
        "title": title,
        "status": status.as_u16(),
        "detail": detail.into(),
        "requestId": uuid(),
    }))
    .into_response();
    *response.status_mut() = status;
    response
}

fn page_info(page: i64, page_size: i64, total_items: i64) -> Value {
    let total_pages = if total_items == 0 {
        0
    } else {
        (total_items + page_size - 1) / page_size
    };
    json!({
        "mode": "offset",
        "page": page,
        "pageSize": page_size,
        "totalItems": total_items.to_string(),
        "totalPages": total_pages,
        "nextCursor": null,
        "hasMore": page < total_pages,
    })
}

fn resource_response(status: StatusCode, item: Value) -> Response {
    success_response(status, json!({ "item": item, "requestId": uuid() }))
}

fn list_response(items: Vec<Value>, page: i64, page_size: i64, total_items: i64) -> Response {
    success_response(
        StatusCode::OK,
        json!({
            "items": items,
            "pageInfo": page_info(page, page_size, total_items),
            "requestId": uuid(),
        }),
    )
}

fn store_error_response(error: StoreError) -> Response {
    match error {
        StoreError::NotFound(detail) => {
            problem_response(StatusCode::NOT_FOUND, "Not Found", detail)
        }
        StoreError::Conflict(detail) => problem_response(StatusCode::CONFLICT, "Conflict", detail),
        StoreError::Invalid(detail) => {
            problem_response(StatusCode::BAD_REQUEST, "Bad Request", detail)
        }
        StoreError::Unavailable(detail) => {
            problem_response(StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error", detail)
        }
    }
}

fn idempotency_key(headers: &axum::http::HeaderMap) -> Result<String, Response> {
    match headers.get("Idempotency-Key") {
        Some(value) => {
            let value = value
                .to_str()
                .map_err(|_| problem_response(StatusCode::BAD_REQUEST, "Bad Request", "Idempotency-Key must be a valid header value"))?;
            if value.len() < 8 || value.len() > 256 {
                return Err(problem_response(
                    StatusCode::BAD_REQUEST,
                    "Bad Request",
                    "Idempotency-Key must be between 8 and 256 characters",
                ));
            }
            Ok(value.to_owned())
        }
        None => Err(problem_response(
            StatusCode::BAD_REQUEST,
            "Bad Request",
            "Idempotency-Key header is required for this operation",
        )),
    }
}

#[derive(Debug, Deserialize)]
struct PageQuery {
    page: Option<i64>,
    page_size: Option<i64>,
}

fn page_bounds(query: &PageQuery) -> (i64, i64) {
    let page = query.page.unwrap_or(1).clamp(1, i64::MAX);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 200);
    (page, page_size)
}

#[derive(Debug, Deserialize)]
struct TemplateListQuery {
    channel: Option<String>,
    status: Option<String>,
    keyword: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
}

// -------------------------------------------------------------------- router

pub fn admin_messaging_router_with_store(
    store: Arc<dyn MessagingAdminStore + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/messaging/notifications",
            get(list_notifications).post(create_notification),
        )
        .route(
            "/backend/v3/api/messaging/announcements",
            get(list_announcements).post(publish_announcement),
        )
        .route(
            "/backend/v3/api/messaging/push_messages",
            get(list_push_messages).post(send_push_message),
        )
        .route(
            "/backend/v3/api/messaging/outbound_messages",
            get(list_outbound_messages).post(send_outbound_message),
        )
        .route(
            "/backend/v3/api/messaging/verification_policies",
            get(list_verification_policies),
        )
        .route(
            "/backend/v3/api/messaging/verification_policies/{policyId}",
            put(update_verification_policy),
        )
        .route(
            "/backend/v3/api/messaging/channels/{channel}",
            get(retrieve_channel).put(update_channel),
        )
        .route(
            "/backend/v3/api/messaging/templates",
            get(list_templates).post(create_template),
        )
        .route(
            "/backend/v3/api/messaging/templates/{templateId}",
            get(retrieve_template).put(update_template).delete(delete_template),
        )
        .with_state(MessagingRouterState { store })
}

async fn parse_body<T: for<'de> Deserialize<'de>>(body: axum::body::Bytes) -> Result<T, Response> {
    serde_json::from_slice(&body)
        .map_err(|error| problem_response(StatusCode::BAD_REQUEST, "Bad Request", format!("invalid request body: {error}")))
}

// ------------------------------------------------------------ notifications

async fn list_notifications(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Query(query): Query<PageQuery>,
) -> Response {
    let (page, page_size) = page_bounds(&query);
    match state
        .store
        .list_notifications(&subject, page, page_size)
        .await
    {
        Ok(result) => {
            let items = result
                .items
                .into_iter()
                .map(|item| serde_json::to_value(item).unwrap_or(Value::Null))
                .collect();
            list_response(items, result.page, result.page_size, result.total_items)
        }
        Err(error) => store_error_response(error),
    }
}

async fn create_notification(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> Response {
    let idempotency_key = match idempotency_key(&headers) {
        Ok(key) => key,
        Err(response) => return response,
    };
    let command: CreateNotificationCommand = match parse_body(body).await {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state
        .store
        .create_notification(&subject, &command, &idempotency_key)
        .await
    {
        Ok(item) => match serde_json::to_value(item) {
            Ok(value) => resource_response(StatusCode::CREATED, value),
            Err(_) => problem_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "failed to serialize notification",
            ),
        },
        Err(error) => store_error_response(error),
    }
}

// ------------------------------------------------------------ announcements

async fn list_announcements(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Query(query): Query<PageQuery>,
) -> Response {
    let (page, page_size) = page_bounds(&query);
    match state
        .store
        .list_announcements(&subject, page, page_size)
        .await
    {
        Ok(result) => {
            let items = result
                .items
                .into_iter()
                .map(|item| serde_json::to_value(item).unwrap_or(Value::Null))
                .collect();
            list_response(items, result.page, result.page_size, result.total_items)
        }
        Err(error) => store_error_response(error),
    }
}

async fn publish_announcement(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> Response {
    let idempotency_key = match idempotency_key(&headers) {
        Ok(key) => key,
        Err(response) => return response,
    };
    let command: PublishAnnouncementCommand = match parse_body(body).await {
        Ok(command) => command,
        Err(response) => return response,
    };
    if command.audiences.is_empty() {
        return problem_response(StatusCode::BAD_REQUEST, "Bad Request", "audiences must not be empty");
    }
    for audience in &command.audiences {
        if let Err(error) = crate::ports::parse_audience_kind(&audience.kind) {
            return problem_response(StatusCode::BAD_REQUEST, "Bad Request", error);
        }
    }
    if let Err(error) = crate::ports::parse_announcement_severity(command.severity.as_deref()) {
        return problem_response(StatusCode::BAD_REQUEST, "Bad Request", error);
    }
    match state
        .store
        .publish_announcement(&subject, &command, &idempotency_key)
        .await
    {
        Ok(item) => match serde_json::to_value(item) {
            Ok(value) => resource_response(StatusCode::CREATED, value),
            Err(_) => problem_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "failed to serialize announcement",
            ),
        },
        Err(error) => store_error_response(error),
    }
}

// ------------------------------------------------------------- push messages

async fn list_push_messages(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Query(query): Query<PageQuery>,
) -> Response {
    let (page, page_size) = page_bounds(&query);
    match state
        .store
        .list_push_messages(&subject, page, page_size)
        .await
    {
        Ok(result) => {
            let items = result
                .items
                .into_iter()
                .map(|item| serde_json::to_value(item).unwrap_or(Value::Null))
                .collect();
            list_response(items, result.page, result.page_size, result.total_items)
        }
        Err(error) => store_error_response(error),
    }
}

async fn send_push_message(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> Response {
    let idempotency_key = match idempotency_key(&headers) {
        Ok(key) => key,
        Err(response) => return response,
    };
    let command: SendPushMessageCommand = match parse_body(body).await {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state
        .store
        .send_push_message(&subject, &command, &idempotency_key)
        .await
    {
        Ok(item) => match serde_json::to_value(item) {
            Ok(value) => resource_response(StatusCode::CREATED, value),
            Err(_) => problem_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "failed to serialize push message",
            ),
        },
        Err(error) => store_error_response(error),
    }
}

// ---------------------------------------------------------- outbound messages

async fn list_outbound_messages(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Query(query): Query<PageQuery>,
) -> Response {
    let (page, page_size) = page_bounds(&query);
    match state
        .store
        .list_outbound_messages(&subject, page, page_size)
        .await
    {
        Ok(result) => {
            let items = result
                .items
                .into_iter()
                .map(|item| serde_json::to_value(item).unwrap_or(Value::Null))
                .collect();
            list_response(items, result.page, result.page_size, result.total_items)
        }
        Err(error) => store_error_response(error),
    }
}

async fn send_outbound_message(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> Response {
    let idempotency_key = match idempotency_key(&headers) {
        Ok(key) => key,
        Err(response) => return response,
    };
    let command: SendOutboundMessageCommand = match parse_body(body).await {
        Ok(command) => command,
        Err(response) => return response,
    };
    if let Err(error) = crate::ports::parse_channel(&command.channel) {
        return problem_response(StatusCode::BAD_REQUEST, "Bad Request", error);
    }
    match state
        .store
        .send_outbound_message(&subject, &command, &idempotency_key)
        .await
    {
        Ok(item) => match serde_json::to_value(item) {
            Ok(value) => resource_response(StatusCode::CREATED, value),
            Err(_) => problem_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "failed to serialize outbound message",
            ),
        },
        Err(error) => store_error_response(error),
    }
}

// --------------------------------------------------------- verification policy

async fn list_verification_policies(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Query(query): Query<PageQuery>,
) -> Response {
    let (page, page_size) = page_bounds(&query);
    match state
        .store
        .list_verification_policies(&subject, page, page_size)
        .await
    {
        Ok(result) => {
            let items = result
                .items
                .into_iter()
                .map(|item| serde_json::to_value(item).unwrap_or(Value::Null))
                .collect();
            list_response(items, result.page, result.page_size, result.total_items)
        }
        Err(error) => store_error_response(error),
    }
}

async fn update_verification_policy(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Path(policy_id): Path<i64>,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> Response {
    let idempotency_key = match idempotency_key(&headers) {
        Ok(key) => key,
        Err(response) => return response,
    };
    let command: UpdateVerificationPolicyCommand = match parse_body(body).await {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state
        .store
        .update_verification_policy(&subject, policy_id, &command, &idempotency_key)
        .await
    {
        Ok(item) => match serde_json::to_value(item) {
            Ok(value) => resource_response(StatusCode::OK, value),
            Err(_) => problem_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "failed to serialize verification policy",
            ),
        },
        Err(error) => store_error_response(error),
    }
}

// ------------------------------------------------------------------- channels

async fn retrieve_channel(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Path(channel): Path<String>,
) -> Response {
    if let Err(error) = crate::ports::parse_channel(&channel) {
        return problem_response(StatusCode::BAD_REQUEST, "Bad Request", error);
    }
    match state.store.retrieve_channel(&subject, &channel).await {
        Ok(item) => match serde_json::to_value(item) {
            Ok(value) => resource_response(StatusCode::OK, value),
            Err(_) => problem_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "failed to serialize channel",
            ),
        },
        Err(error) => store_error_response(error),
    }
}

async fn update_channel(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Path(channel): Path<String>,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> Response {
    let idempotency_key = match idempotency_key(&headers) {
        Ok(key) => key,
        Err(response) => return response,
    };
    if let Err(error) = crate::ports::parse_channel(&channel) {
        return problem_response(StatusCode::BAD_REQUEST, "Bad Request", error);
    }
    let command: UpdateChannelCommand = match parse_body(body).await {
        Ok(command) => command,
        Err(response) => return response,
    };
    if let Err(error) = crate::ports::parse_channel_provider(&channel, &command.provider) {
        return problem_response(StatusCode::BAD_REQUEST, "Bad Request", error);
    }
    match state
        .store
        .update_channel(&subject, &channel, &command, &idempotency_key)
        .await
    {
        Ok(item) => match serde_json::to_value(item) {
            Ok(value) => resource_response(StatusCode::OK, value),
            Err(_) => problem_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "failed to serialize channel",
            ),
        },
        Err(error) => store_error_response(error),
    }
}

// ------------------------------------------------------------------ templates

async fn list_templates(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Query(query): Query<TemplateListQuery>,
) -> Response {
    let (page, page_size) = page_bounds(&PageQuery {
        page: query.page,
        page_size: query.page_size,
    });
    match state
        .store
        .list_templates(
            &subject,
            query.channel.as_deref(),
            query.status.as_deref(),
            query.keyword.as_deref(),
            page,
            page_size,
        )
        .await
    {
        Ok(result) => {
            let items = result
                .items
                .into_iter()
                .map(|item| serde_json::to_value(item).unwrap_or(Value::Null))
                .collect();
            list_response(items, result.page, result.page_size, result.total_items)
        }
        Err(error) => store_error_response(error),
    }
}

async fn create_template(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> Response {
    let idempotency_key = match idempotency_key(&headers) {
        Ok(key) => key,
        Err(response) => return response,
    };
    let command: CreateTemplateCommand = match parse_body(body).await {
        Ok(command) => command,
        Err(response) => return response,
    };
    if let Err(error) = crate::ports::parse_channel(&command.channel) {
        return problem_response(StatusCode::BAD_REQUEST, "Bad Request", error);
    }
    match state
        .store
        .create_template(&subject, &command, &idempotency_key)
        .await
    {
        Ok(item) => match serde_json::to_value(item) {
            Ok(value) => resource_response(StatusCode::CREATED, value),
            Err(_) => problem_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "failed to serialize template",
            ),
        },
        Err(error) => store_error_response(error),
    }
}

async fn retrieve_template(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Path(template_id): Path<i64>,
) -> Response {
    match state.store.retrieve_template(&subject, template_id).await {
        Ok(item) => match serde_json::to_value(item) {
            Ok(value) => resource_response(StatusCode::OK, value),
            Err(_) => problem_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "failed to serialize template",
            ),
        },
        Err(error) => store_error_response(error),
    }
}

async fn update_template(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Path(template_id): Path<i64>,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> Response {
    let idempotency_key = match idempotency_key(&headers) {
        Ok(key) => key,
        Err(response) => return response,
    };
    let command: UpdateTemplateCommand = match parse_body(body).await {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state
        .store
        .update_template(&subject, template_id, &command, &idempotency_key)
        .await
    {
        Ok(item) => match serde_json::to_value(item) {
            Ok(value) => resource_response(StatusCode::OK, value),
            Err(_) => problem_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "failed to serialize template",
            ),
        },
        Err(error) => store_error_response(error),
    }
}

async fn delete_template(
    State(state): State<MessagingRouterState>,
    subject: MessagingAdminSubject,
    Path(template_id): Path<i64>,
    headers: axum::http::HeaderMap,
    _body: axum::body::Bytes,
) -> Response {
    let idempotency_key = match idempotency_key(&headers) {
        Ok(key) => key,
        Err(response) => return response,
    };
    match state
        .store
        .delete_template(&subject, template_id, &idempotency_key)
        .await
    {
        Ok(()) => success_response(
            StatusCode::OK,
            json!({
                "templateId": template_id.to_string(),
                "deleted": true,
                "requestId": uuid(),
            }),
        ),
        Err(error) => store_error_response(error),
    }
}
