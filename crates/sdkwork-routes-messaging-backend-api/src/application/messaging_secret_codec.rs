//! AEAD channel secret codec backed by `sdkwork-utils-rust` AES-256-GCM.
//!
//! Channel secrets (SMTP password, SMS provider access keys) are stored
//! encrypted at rest; responses never expose plaintext (messaging README:
//! sensitive fields are write-only, storage keeps only encrypted tokens).

use sdkwork_messaging_delivery_service::EncodedMessagingSecret;
use sdkwork_utils_rust::{aes_gcm_decrypt, aes_gcm_encrypt, derive_aes_256_key, sha256_hash};

const KEY_ID_DEV: &str = "dev-local";
const DEFAULT_KEY_SALT: &[u8] = b"sdkwork-messaging-channel-secret";
const DEFAULT_KEY_INFO: &[u8] = b"sdkwork-messaging:channel-secret:v1";

#[derive(Clone, Debug)]
pub struct MessagingSecretContext {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub channel: String,
}

pub trait MessagingSecretCodec: Send + Sync {
    fn encode(
        &self,
        context: &MessagingSecretContext,
        secret: &str,
    ) -> Result<EncodedMessagingSecret, String>;

    fn decode(
        &self,
        context: &MessagingSecretContext,
        key_id: &str,
        ciphertext: &str,
    ) -> Result<String, String>;
}

#[derive(Clone)]
pub struct AesGcmMessagingSecretCodec {
    key_id: String,
    key: [u8; 32],
}

impl AesGcmMessagingSecretCodec {
    pub fn new(key_id: impl Into<String>, master_secret: &[u8]) -> Self {
        let key = derive_aes_256_key(master_secret, DEFAULT_KEY_SALT, DEFAULT_KEY_INFO);
        Self {
            key_id: key_id.into(),
            key,
        }
    }

    /// Reads `SDKWORK_MESSAGING_SECRET_ENCRYPTION_KEY`; falls back to a
    /// fixed development key so local setups can exercise the codec without
    /// extra configuration. Production deployments must set the environment
    /// variable.
    pub fn from_env() -> Self {
        match std::env::var("SDKWORK_MESSAGING_SECRET_ENCRYPTION_KEY") {
            Ok(master) if !master.trim().is_empty() => {
                Self::new(format!("key-{}", sha256_hash(master.trim().as_bytes())), master.trim().as_bytes())
            }
            _ => Self::new(KEY_ID_DEV, b"sdkwork-messaging-dev-master-secret-do-not-use-in-prod"),
        }
    }

    pub fn key_id(&self) -> &str {
        &self.key_id
    }
}

impl MessagingSecretCodec for AesGcmMessagingSecretCodec {
    fn encode(
        &self,
        _context: &MessagingSecretContext,
        secret: &str,
    ) -> Result<EncodedMessagingSecret, String> {
        let ciphertext = aes_gcm_encrypt(&self.key, secret.as_bytes())?;
        let fingerprint = sha256_hash(secret.as_bytes());
        Ok(EncodedMessagingSecret {
            ciphertext,
            key_id: self.key_id.clone(),
            fingerprint,
        })
    }

    fn decode(
        &self,
        _context: &MessagingSecretContext,
        key_id: &str,
        ciphertext: &str,
    ) -> Result<String, String> {
        if key_id != self.key_id {
            return Err(format!(
                "channel secret was encrypted with key `{key_id}` which is no longer active"
            ));
        }
        let plaintext = aes_gcm_decrypt(&self.key, ciphertext)?;
        String::from_utf8(plaintext)
            .map_err(|error| format!("channel secret is not valid UTF-8: {error}"))
    }
}
