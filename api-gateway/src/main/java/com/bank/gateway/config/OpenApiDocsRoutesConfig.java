package com.bank.gateway.config;

import java.util.Map;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiDocsRoutesConfig {

	private static final Map<String, String> DOC_SERVICES = Map.of(
			"auth", "auth-service",
			"customer", "customer-service",
			"account", "account-service",
			"transaction", "transaction-service");

	@Bean
	RouteLocator openApiDocsRoutes(RouteLocatorBuilder builder) {
		RouteLocatorBuilder.Builder routes = builder.routes();
		DOC_SERVICES.forEach((prefix, serviceId) -> routes.route(serviceId + "-openapi", r -> r
				.path("/docs/" + prefix + "/v3/api-docs")
				.filters(f -> f.setPath("/v3/api-docs"))
				.uri("lb://" + serviceId)));
		return routes.build();
	}
}
