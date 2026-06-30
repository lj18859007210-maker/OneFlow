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
    void listReturnsLegacyScopedStatsAndFilterOptions() throws Exception {
        String developerToken = login("dev");

        mockMvc.perform(get("/api/requirements?page=1&pageSize=10")
                        .header("Authorization", "Bearer " + developerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.total", is(2)))
                .andExpect(jsonPath("$.statusStats.待审批", is(1)))
                .andExpect(jsonPath("$.statusStats.已发布", is(1)))
                .andExpect(jsonPath("$.priorityStats.高", is(1)))
                .andExpect(jsonPath("$.priorityStats.中", is(1)))
                .andExpect(jsonPath("$.scoreStats.0-60", is(0)))
                .andExpect(jsonPath("$.scoreStats.61-80", is(0)))
                .andExpect(jsonPath("$.scoreStats.81-100", is(1)))
                .andExpect(jsonPath("$.avgScore", is(88.0)))
                .andExpect(jsonPath("$.filterOptions.platforms[0]", is("OneFlow")))
                .andExpect(jsonPath("$.filterOptions.platforms[1]", is("Portal")));
    }

    @Test
    void listAppliesLegacyFilterParameters() throws Exception {
        String adminToken = login("admin");

        mockMvc.perform(get("/api/requirements?page=1&pageSize=10&status=已发布&platform=Portal&developer=Developer&priority=中&minScore=80&maxScore=90")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.total", is(1)))
                .andExpect(jsonPath("$.data[0].id", is("req-002")));
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

        mockMvc.perform(get("/api/requirements/approval-list?page=1&pageSize=10&approvalStatus=&keyword=")
                        .header("Authorization", "Bearer " + login("dev")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.total", is(3)))
                .andExpect(jsonPath("$.data[0].platform").doesNotExist())
                .andExpect(jsonPath("$.data[0].score").doesNotExist())
                .andExpect(jsonPath("$.data[0].steps").doesNotExist());

        mockMvc.perform(get("/api/requirements/gantt?platform=OneFlow")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.platformStats.OneFlow.total", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.data[?(@.id == 'req-003')][0].approvedAt").exists());

        mockMvc.perform(get("/api/requirements/dashboard")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.throughput").isArray())
                .andExpect(jsonPath("$.data.approvalCycle.trend").isArray())
                .andExpect(jsonPath("$.data.developmentCycle.trend").isArray())
                .andExpect(jsonPath("$.data.overdue.total", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.data.platformRanking").isArray())
                .andExpect(jsonPath("$.data.platformRanking[0].total").exists())
                .andExpect(jsonPath("$.data.platformRanking[0].released").exists())
                .andExpect(jsonPath("$.data.platformRanking[0].releaseRate").exists())
                .andExpect(jsonPath("$.data.developerHeatmap").isArray());
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
