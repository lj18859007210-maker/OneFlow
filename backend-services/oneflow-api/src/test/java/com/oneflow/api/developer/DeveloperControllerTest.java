package com.oneflow.api.developer;

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
import static org.hamcrest.Matchers.emptyString;
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
        "oneflow.jwt.secret=test-secret-for-developer-controller",
        "oneflow.captcha.enabled=false"
})
class DeveloperControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void listAssignableDetailStatsAndDepartmentsKeepNodeResponseShape() throws Exception {
        String adminToken = login("admin");
        String userToken = login("normal");

        mockMvc.perform(get("/api/developers?department=Backend&status=1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].userId", is("u-dev")))
                .andExpect(jsonPath("$.data[0].skills").isArray())
                .andExpect(jsonPath("$.data[0].maxLoad", is(5)));

        mockMvc.perform(get("/api/developers/assignable")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(2)));

        mockMvc.perform(get("/api/developers/u-dev")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", is("u-dev")))
                .andExpect(jsonPath("$.data.profileId", is("dev-profile-001")));

        mockMvc.perform(get("/api/developers/load-stats")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].loadPercent", greaterThanOrEqualTo(0.0)));

        mockMvc.perform(get("/api/developers/departments")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0]", is("Backend")));
    }

    @Test
    void createUpdateAndRemoveDeveloperProfileThroughUserAccount() throws Exception {
        String adminToken = login("admin");

        MvcResult createResult = mockMvc.perform(post("/api/developers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"newdev@example.com\",\"department\":\"Integration\",\"skills\":[\"Java\",\"Spring\"],\"maxLoad\":8}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.userId", is("u-new-dev")))
                .andExpect(jsonPath("$.data.profileId", not(emptyString())))
                .andExpect(jsonPath("$.data.skills[0]", is("Java")))
                .andReturn();

        String userId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("userId").asText();

        mockMvc.perform(put("/api/developers/" + userId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New Developer Updated\",\"department\":\"Platform\",\"skills\":[\"Oracle\"],\"maxLoad\":6,\"status\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("New Developer Updated")))
                .andExpect(jsonPath("$.data.department", is("Platform")))
                .andExpect(jsonPath("$.data.skills[0]", is("Oracle")))
                .andExpect(jsonPath("$.data.maxLoad", is(6)));

        mockMvc.perform(delete("/api/developers/" + userId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        mockMvc.perform(get("/api/developers/" + userId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
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
