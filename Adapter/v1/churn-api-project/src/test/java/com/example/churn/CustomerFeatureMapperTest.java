package com.example.churn;

import com.example.churn.model.PredictionRequest;
import com.example.churn.service.CustomerFeatureMapper;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CustomerFeatureMapperTest {

    @Test
    void shouldMapDatabaseColumnsToPredictionRequest() {
        Map<String, Object> row = new HashMap<>();
        row.put("customer_id", "CUST-1001");
        row.put("plan", "fiber_200");
        row.put("monthly_price", 59.99);
        row.put("tenure_months", 24);
        row.put("outages", 2);
        row.put("complaints", 1);
        row.put("support_calls", 4);
        row.put("late_payments", 1);
        row.put("competitor_available", 0);
        row.put("monthly_contract", 1);
        row.put("speed_mbps", 500);
        row.put("avg_monthly_usage_gb", 220);
        row.put("recent_plan_change", 0);
        row.put("contract_renewal_due", 1);
        row.put("region", "north");

        PredictionRequest request = CustomerFeatureMapper.toPredictionRequest(row);

        assertEquals("fiber_200", request.getPlan());
        assertEquals(59.99, request.getMonthlyPrice());
        assertEquals(24, request.getTenureMonths());
        assertEquals(2, request.getOutages());
        assertEquals(1, request.getComplaints());
        assertEquals(4, request.getSupportCalls());
        assertEquals(1, request.getLatePayments());
        assertEquals(0, request.getCompetitorAvailable());
        assertEquals(1, request.getMonthlyContract());
        assertEquals(500, request.getSpeedMbps());
        assertEquals(220, request.getAvgMonthlyUsageGb());
        assertEquals(0, request.getRecentPlanChange());
        assertEquals(1, request.getContractRenewalDue());
        assertEquals("north", request.getRegion());
    }
}
