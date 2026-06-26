package com.oneflow.api.requirement;

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

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "oneflow.jwt.secret=test-secret-for-requirement-controller",
        "oneflow.captcha.enabled=false"
})
class RequirementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void listAndDetailUseLegacyEnvelope() throws Exception {
        String token = login("admin");

        mockMvc.perform(get("/api/requirements?page=1&pageSize=10&keyword=Existing")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.total", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.data[0].title", is("Existing Requirement")));

        mockMvc.perform(get("/api/requirements/req-001")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is("req-001")))
                .andExpect(jsonPath("$.data.ccEmails").isArray())
                .andExpect(jsonPath("$.data.steps").isArray());
    }


    @Test
    void normalUserCannotApproveRequirement() throws Exception {
        String userToken = login("normal");

        mockMvc.perform(put("/api/requirements/req-001/approve")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":true}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void peripheralRequirementEndpointsReturnFrontendFriendlyShapes() throws Exception {
        String adminToken = login("admin");
        String userToken = login("normal");

        mockMvc.perform(get("/api/requirements/drafts?submitter=Normal User")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].id", is("req-draft-001")));

        mockMvc.perform(get("/api/requirements/my?page=1&pageSize=10")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].id", is("req-002")));

        mockMvc.perform(get("/api/requirements/drafts/latest")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is("req-draft-001")));

        mockMvc.perform(get("/api/requirements/approval-list?page=1&pageSize=10&approvalStatus=pending")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.total", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.data[0].approvalStatus", is("pending")));

        mockMvc.perform(get("/api/requirements/gantt?platform=OneFlow")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.platformStats.OneFlow.total", greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/requirements/dashboard")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.overview.total", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.data.throughput").isArray())
                .andExpect(jsonPath("$.data.platformRanking").isArray())
                .andExpect(jsonPath("$.data.overdue.rate").exists());
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
