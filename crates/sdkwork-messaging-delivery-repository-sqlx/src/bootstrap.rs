//! SDKWork Messaging database pool bootstrap via `sdkwork-database`.

use sdkwork_database_config::DatabaseConfig;
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool, PoolError};

pub use sdkwork_messaging_database_host::{
    bootstrap_messaging_database, bootstrap_messaging_database_from_env, MessagingDatabaseHost,
};

pub type MessagingDatabasePool = DatabasePool;

pub async fn connect_messaging_database_pool_from_env() -> Result<MessagingDatabasePool, PoolError>
{
    let config = DatabaseConfig::from_env("MESSAGING")?;
    create_pool_from_config(config).await
}

pub async fn connect_and_bootstrap_messaging_database_from_env(
) -> Result<MessagingDatabaseHost, String> {
    let pool = connect_messaging_database_pool_from_env()
        .await
        .map_err(|error| error.to_string())?;
    bootstrap_messaging_database(pool).await
}
