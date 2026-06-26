package com.oneflow.api.auth;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.Base64;

import javax.crypto.Cipher;

import org.springframework.stereotype.Service;

/**
 * RSA 密钥对管理。
 * 启动时生成 2048 位密钥，提供公钥 PEM 和私钥解密能力。
 * 用于前端 RSA-OAEP/SHA-256 加密密码传输，对齐旧后端 backend/crypto/rsa.js 协议。
 */
@Service
public class RsaKeyService {

    private final PublicKey publicKey;
    private final PrivateKey privateKey;
    private final String publicKeyPem;

    public RsaKeyService() {
        try {
            KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
            gen.initialize(2048);
            KeyPair pair = gen.generateKeyPair();
            this.publicKey = pair.getPublic();
            this.privateKey = pair.getPrivate();
            this.publicKeyPem = formatPublicKeyPem(this.publicKey);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize RSA key pair", e);
        }
    }

    public String getPublicKeyPem() {
        return publicKeyPem;
    }

    /**
     * 使用 RSA-OAEP/SHA-256 解密 base64 编码的密文。
     * 返回值是明文字符串（UTF-8），解密失败返回 null。
     */
    public String decrypt(String base64Encrypted) {
        if (base64Encrypted == null || base64Encrypted.isEmpty()) {
            return null;
        }
        try {
            Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
            cipher.init(Cipher.DECRYPT_MODE, privateKey);
            byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(base64Encrypted));
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    /** 将 SPKI 格式的公钥编码为标准 PEM 字符串 */
    private static String formatPublicKeyPem(PublicKey key) {
        String b64 = Base64.getMimeEncoder(64, new byte[] { '\n' })
                .encodeToString(key.getEncoded());
        return "-----BEGIN PUBLIC KEY-----\n" + b64 + "\n-----END PUBLIC KEY-----";
    }
}
