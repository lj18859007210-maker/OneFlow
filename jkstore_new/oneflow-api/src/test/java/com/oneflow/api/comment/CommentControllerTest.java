package com.oneflow.api.comment;

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

import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "oneflow.jwt.secret=test-secret-for-comment-controller",
        "oneflow.captcha.enabled=false"
})
class CommentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void listCommentsByRequirementKeepsLegacyEnvelopeAndAttachmentsField() throws Exception {
        String token = login("admin");

        mockMvc.perform(get("/api/comments/req-001")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].id", is("comment-001")))
                .andExpect(jsonPath("$.data[0].attachments").isArray());
    }

    @Test
    void createCommentForVisibleRequirementUsesCurrentUser() throws Exception {
        String token = login("normal");

        mockMvc.perform(post("/api/comments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"requirementId\":\"req-002\",\"type\":\"note\",\"content\":\"Java comment\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", not(emptyString())))
                .andExpect(jsonPath("$.data.userId", is("u-user")))
                .andExpect(jsonPath("$.data.userName", is("Normal User")))
                .andExpect(jsonPath("$.data.content", is("Java comment")))
                .andExpect(jsonPath("$.data.attachments").isArray());
    }

    @Test
    void rejectCommentWhenUserCannotViewRequirement() throws Exception {
        String token = login("normal");

        mockMvc.perform(post("/api/comments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"requirementId\":\"req-001\",\"type\":\"note\",\"content\":\"No access\"}"))
                .andExpect(status().isForbidden());
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
