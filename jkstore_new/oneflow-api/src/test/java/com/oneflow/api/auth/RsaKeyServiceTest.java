package com.oneflow.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.MGF1ParameterSpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import org.junit.jupiter.api.Test;

class RsaKeyServiceTest {

    @Test
    void decryptsWebCryptoCompatibleOaepSha256Password() throws Exception {
        RsaKeyService rsaKeyService = new RsaKeyService();
        String password = "admin";

        String encrypted = encryptLikeBrowserWebCrypto(password, rsaKeyService.getPublicKeyPem());

        assertThat(rsaKeyService.decrypt(encrypted)).isEqualTo(password);
    }

    private String encryptLikeBrowserWebCrypto(String plainText, String publicKeyPem) throws Exception {
        // 浏览器端 Login.vue 使用 WebCrypto:
        // importKey("spki", publicKey, { name: "RSA-OAEP", hash: "SHA-256" })
        // encrypt({ name: "RSA-OAEP" }, key, passwordBytes)
        // 这里用同等参数生成密文，避免 Java 端 OAEP/MGF1 参数和前端不一致。
        Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
        OAEPParameterSpec oaepSpec = new OAEPParameterSpec(
                "SHA-256",
                "MGF1",
                MGF1ParameterSpec.SHA256,
                PSource.PSpecified.DEFAULT);
        cipher.init(Cipher.ENCRYPT_MODE, parsePublicKey(publicKeyPem), oaepSpec);
        byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(encrypted);
    }

    private PublicKey parsePublicKey(String publicKeyPem) throws Exception {
        String base64 = publicKeyPem
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
        byte[] encoded = Base64.getDecoder().decode(base64);
        return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(encoded));
    }
}
