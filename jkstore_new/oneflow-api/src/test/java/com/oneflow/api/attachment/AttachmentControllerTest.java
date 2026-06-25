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

import static org.hamcrest.Matchers.emptyString;
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
    void manageRequirementAttachmentLifecycle() throws Exception {
        String token = login("admin");

        MvcResult uploadResult = mockMvc.perform(multipart("/api/attachments/requirements/req-001/upload")
                        .file(new MockMultipartFile("file", "design.pdf", "application/pdf", "design".getBytes("UTF-8")))
                        .param("category", "design")
                        .param("remark", "first")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", not(emptyString())))
                .andExpect(jsonPath("$.data.summary.previewable", is(true)))
                .andReturn();
        String attachmentId = objectMapper.readTree(uploadResult.getResponse().getContentAsString()).path("data").path("id").asText();
        String versionId = objectMapper.readTree(uploadResult.getResponse().getContentAsString())
                .path("data").path("currentVersion").path("id").asText();

        mockMvc.perform(get("/api/attachments/requirements/req-001")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id", is(attachmentId)))
                .andExpect(jsonPath("$.data[0].actions.canDownload", is(true)));

        mockMvc.perform(multipart("/api/attachments/" + attachmentId + "/versions")
                        .file(new MockMultipartFile("file", "design-v2.pdf", "application/pdf", "design-v2".getBytes("UTF-8")))
                        .param("remark", "second")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.versions[0].versionNo", is(2)));

        mockMvc.perform(get("/api/attachments/files/version/" + versionId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    String content = result.getResponse().getContentAsString();
                    org.hamcrest.MatcherAssert.assertThat(content, is("design"));
                });

        mockMvc.perform(delete("/api/attachments/" + attachmentId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));
    }

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

    @Test
    void legacyImageUploadReturnsUrls() throws Exception {
        String token = login("admin");

        mockMvc.perform(multipart("/api/upload")
                        .file(new MockMultipartFile("files", "note.png", "image/png", "png".getBytes("UTF-8")))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0]", not(emptyString())));
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
