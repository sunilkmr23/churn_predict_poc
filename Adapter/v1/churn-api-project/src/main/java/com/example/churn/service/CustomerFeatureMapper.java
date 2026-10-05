package com.example.churn.service;

import com.example.churn.model.PredictionRequest;

import java.util.Map;

public final class CustomerFeatureMapper {

    private CustomerFeatureMapper() {
    }

    public static PredictionRequest toPredictionRequest(Map<String, Object> row) {
        PredictionRequest request = new PredictionRequest();

        request.setPlan(asString(
                row.get("Plan"),
                row.get("PLAN"),
                row.get("plan"),
                row.get("plan_name"),
                "fiber"
        ));
        request.setMonthlyPrice(asDouble(
                row.get("MonthlyPrice"),
                row.get("MONTHLYPRICE"),
                row.get("monthly_price"),
                row.get("monthlyPrice"),
                0d
        ));
        request.setTenureMonths(asInt(
                row.get("TenureMonths"),
                row.get("TENUREMONTHS"),
                row.get("tenure_months"),
                row.get("tenureMonths"),
                0
        ));
        request.setOutages(asInt(row.get("Outages"), row.get("outages"), 0));
        request.setComplaints(asInt(row.get("Complaints"), row.get("complaints"), 0));
        request.setSupportCalls(asInt(row.get("SupportCalls"), row.get("support_calls"), row.get("supportCalls"), 0));
        request.setLatePayments(asInt(row.get("LatePayments"), row.get("late_payments"), row.get("latePayments"), 0));
        request.setCompetitorAvailable(asInt(row.get("CompetitorAvailable"), row.get("competitor_available"), row.get("competitorAvailable"), 0));
        request.setMonthlyContract(asInt(row.get("MonthlyContract"), row.get("monthly_contract"), row.get("monthlyContract"), 0));
        request.setSpeedMbps(asInt(row.get("SpeedMBPS"), row.get("speed_mbps"), row.get("speedMbps"), 0));
        request.setAvgMonthlyUsageGb(asInt(row.get("AvgMonthlyUsageGb"), row.get("avg_monthly_usage_gb"), row.get("avgMonthlyUsageGb"), 0));
        request.setRecentPlanChange(asInt(row.get("RecentPlanChange"), row.get("recent_plan_change"), row.get("recentPlanChange"), 0));
        request.setContractRenewalDue(asInt(row.get("ContractRenewalDue"), row.get("contract_renewal_due"), row.get("contractRenewalDue"), 0));
        request.setRegion(asString(row.get("Region"), row.get("region"), "region_a"));

        return request;
    }

    private static String asString(Object... values) {
        for (Object value : values) {
            if (value != null && !value.toString().trim().isEmpty()) {
                return value.toString();
            }
        }
        return "fiber";
    }

    private static double asDouble(Object... values) {
        for (Object value : values) {
            if (value != null) {
                try {
                    return Double.parseDouble(value.toString());
                } catch (NumberFormatException ignored) {
                    // ignore and continue
                }
            }
        }
        return 0d;
    }

    private static int asInt(Object... values) {
        for (Object value : values) {
            if (value != null) {
                try {
                    return Integer.parseInt(value.toString());
                } catch (NumberFormatException ignored) {
                    // ignore and continue
                }
            }
        }
        return 0;
    }
}
