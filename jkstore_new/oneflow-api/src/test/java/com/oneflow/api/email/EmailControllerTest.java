package com.oneflow.api.email;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasKey;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "oneflow.jwt.secret=test-secret-for-email-controller",
        "oneflow.captcha.enabled=false"
})
class EmailControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void adminCanReadEmailSettingsWithoutPasswordValue() throws Exception {
        String token = login("admin");

        mockMvc.perform(get("/api/email/settings")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.sendIntervalMinutes", is(15)))
                .andExpect(jsonPath("$.data.smtpHost", is("smtp.seed.example.com")))
                .andExpect(jsonPath("$.data.passwordConfigured", is(true)))
                .andExpect(jsonPath("$.data", not(hasKey("smtpPassword"))));
    }

    @Test
    void adminCanUpdateEmailSettingsAndPasswordStaysPrivate() throws Exception {
        String token = login("admin");

        mockMvc.perform(put("/api/email/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sendIntervalMinutes\":10,\"smtpHost\":\" smtp.example.com \",\"smtpPort\":\"587\",\"smtpSecure\":false,\"smtpUser\":\"mailer@example.com\",\"smtpPassword\":\"secret\",\"fromEmail\":\"notice@example.com\",\"fromName\":\"OneFlow\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.sendIntervalMinutes", is(10)))
                .andExpect(jsonPath("$.data.smtpPort", is(587)))
                .andExpect(jsonPath("$.data.smtpSecure", is(false)))
                .andExpect(jsonPath("$.data.passwordConfigured", is(true)))
                .andExpect(jsonPath("$.data", not(hasKey("smtpPassword"))));
    }

    @Test
    void normalUserCannotSendTestEmail() throws Exception {
        String token = login("normal");

        mockMvc.perform(post("/api/email/send")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"a@example.com\",\"subject\":\"Hi\",\"body\":\"Hello\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminGetsBadRequestWhenEmailPayloadIsInvalid() throws Exception {
        String token = login("admin");

        mockMvc.perform(post("/api/email/send")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"\",\"subject\":\"Hi\",\"body\":\"Hello\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));
    }

    private String login(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"admin\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.path("data").path("token").asText();
    }
}
