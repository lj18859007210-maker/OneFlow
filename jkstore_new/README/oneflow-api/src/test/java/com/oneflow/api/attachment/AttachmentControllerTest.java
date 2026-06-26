package com.oneflow.api.attachment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "oneflow.jwt.secret=test-secret-for-attachment-controller",
        "oneflow.captcha.enabled=false",
        "oneflow.upload.dir=target/test-uploads",
        "oneflow.upload.max-file-size=1048576"
})
class AttachmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;


    @Test
    void uploadCommentAttachmentAndPromoteItToFormalAttachment() throws Exception {
        String token = login("admin");

        MvcResult commentUpload = mockMvc.perform(multipart("/api/attachments/comments/upload")
                        .file(new MockMultipartFile("files", "shot.png", "image/png", "png".getBytes("UTF-8")))
                        .param("requirementId", "req-001")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data[0].status", is("pending")))
                .andReturn();
        String commentAttachmentId = objectMapper.readTree(commentUpload.getResponse().getContentAsString())
                .path("data").get(0).path("id").asText();

        mockMvc.perform(post("/api/attachments/comments/" + commentAttachmentId + "/promote")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"requirementId\":\"req-001\",\"category\":\"requirement\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.sourceType", is("comment-link")))
                .andExpect(jsonPath("$.data.linkedCommentAttachmentId", is(commentAttachmentId)));
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
