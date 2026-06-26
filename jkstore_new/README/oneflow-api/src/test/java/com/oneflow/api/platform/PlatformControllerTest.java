package com.oneflow.api.platform;

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

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "oneflow.jwt.secret=test-secret-for-platform-controller",
        "oneflow.captcha.enabled=false"
})
class PlatformControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void normalUserCanReadConfiguredPlatforms() throws Exception {
        String token = login("normal");

        mockMvc.perform(get("/api/platforms")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].name", is("Default Group")))
                .andExpect(jsonPath("$.data[0].children[0]", is("Portal")));
    }

    @Test
    void adminCanUpdatePlatformGroupsAndDuplicatesAreRemoved() throws Exception {
        String token = login("admin");

        mockMvc.perform(put("/api/platforms")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"platforms\":[{\"name\":\" Core \",\"children\":[\" Portal \",\"CRM\",\"Portal\",\"\"]},{\"name\":\"Core\",\"children\":[\"Ignored\"]},{\"name\":\"Data\",\"children\":[\"BI\"]}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].name", is("Core")))
                .andExpect(jsonPath("$.data[0].children", hasSize(2)))
                .andExpect(jsonPath("$.data[1].children[0]", is("BI")));
    }

    @Test
    void normalUserCannotUpdatePlatforms() throws Exception {
        String token = login("normal");

        mockMvc.perform(put("/api/platforms")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"platforms\":[\"Portal\"]}"))
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
