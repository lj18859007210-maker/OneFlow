package com.oneflow.api;

import com.oneflow.api.config.OneFlowProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(OneFlowProperties.class)
public class OneFlowApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(OneFlowApiApplication.class, args);
    }
}
