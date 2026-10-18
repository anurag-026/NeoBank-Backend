package com.bank.customer.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.observation.ClientRequestObservationContext;
import org.springframework.http.server.observation.ServerRequestObservationContext;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationPredicate;
import io.micrometer.observation.ObservationView;

@Configuration
public class ObservabilityConfig {

	/** Keeps Prometheus scrapes and Eureka heartbeats/registry polls out of traces. */
	@Bean
	ObservationPredicate ignoreInfrastructureObservations() {
		return (name, context) -> {
			if (name.startsWith("spring.security.") && isOrphan(context.getParentObservation())) {
				return false;
			}
			if (context instanceof ServerRequestObservationContext server) {
				return !server.getCarrier().getRequestURI().startsWith("/actuator");
			}
			if (context instanceof ClientRequestObservationContext client && client.getCarrier() != null) {
				return !client.getCarrier().getURI().getPath().startsWith("/eureka");
			}
			return true;
		};
	}

	private static boolean isOrphan(ObservationView parent) {
		return parent == null || (parent instanceof Observation observation && observation.isNoop());
	}
}
