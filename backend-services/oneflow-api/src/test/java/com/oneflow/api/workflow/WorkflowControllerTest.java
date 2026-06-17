package com.oneflow.api.workflow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "oneflow.jwt.secret=test-secret-for-workflow-controller",
        "oneflow.captcha.enabled=false"
})
@Sql(statements = {
        "DELETE FROM workflow_transitions",
        "DELETE FROM workflow_statuses"
}, executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@Sql(scripts = "/data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class WorkflowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void readRequirementWorkflowStatusesAndTransitions() throws Exception {
        String token = login("normal");

        mockMvc.perform(get("/api/workflows/requirement/statuses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].statusCode", is("pending")));

        mockMvc.perform(get("/api/workflows/requirement/transitions")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].allowedRoles[0]", is("admin")));
    }

    @Test
    void manageRequirementWorkflowConfiguration() throws Exception {
        String token = login("admin");

        mockMvc.perform(put("/api/workflows/requirement/statuses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statuses\":[{\"statusCode\":\"draft\",\"statusName\":\"Draft\",\"sortOrder\":5,\"isTerminal\":false,\"enabled\":true},{\"statusCode\":\"done\",\"statusName\":\"Done\",\"sortOrder\":10,\"isTerminal\":true,\"enabled\":true}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].statusCode", is("draft")));

        MvcResult createResult = mockMvc.perform(post("/api/workflows/requirement/transitions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fromStatus\":\"draft\",\"toStatus\":\"done\",\"allowedRoles\":[\"admin\"],\"requireApproval\":false,\"notifyEnabled\":true,\"enabled\":true}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id", not(emptyString())))
                .andExpect(jsonPath("$.data.approvalOutcome", is("none")))
                .andReturn();

        String id = objectMapper.readTree(createResult.getResponse().getContentAsString()).path("data").path("id").asText();
        mockMvc.perform(put("/api/workflows/requirement/transitions/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"allowedRoles\":[\"admin\",\"developer\"],\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allowedRoles.length()", is(2)))
                .andExpect(jsonPath("$.data.enabled", is(false)));

        mockMvc.perform(post("/api/workflows/requirement/reload")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.statuses", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.data.transitions", greaterThanOrEqualTo(1)));
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
