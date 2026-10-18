package com.bank.authservice.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;

@Configuration
public class OpenApiConfig {

	private static final String BEARER_SCHEME = "bearerAuth";

	@Bean
	OpenAPI authServiceOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("NeoBank Auth Service API")
						.version("v1")
						.description("User registration, password + OTP login and RBAC administration. "
								+ "Access tokens are issued by the OAuth2 token endpoint POST /oauth2/token "
								+ "(grant_type=otp, client credentials via HTTP Basic), which is provided by "
								+ "Spring Authorization Server and is not listed here."))
				.servers(List.of(new Server().url("/").description("auth-service (direct)")))
				.components(new Components().addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
						.type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
				.addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
	}
}
