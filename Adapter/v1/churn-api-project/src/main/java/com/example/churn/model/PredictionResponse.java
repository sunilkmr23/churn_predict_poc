package com.example.churn.model;

public class PredictionResponse {

    private int churn_prediction;
    private double churn_probability;
    private double threshold_used;
    private String campaign;
    private String risk;
    private String risk_reason;

    public String getCampaign() {
        return campaign;
    }

    public void setCampaign(String campaign) {
        this.campaign = campaign;
    }

    public String getRisk_reason() {
        return risk_reason;
    }

    public void setRisk_reason(String risk_reason) {
        this.risk_reason = risk_reason;
    }

    public double getThreshold_used() {
        return threshold_used;
    }

    public void setThreshold_used(double threshold_used) {
        this.threshold_used = threshold_used;
    }

    public int getChurn_prediction() {
        return churn_prediction;
    }

    public void setChurn_prediction(int churn_prediction) {
        this.churn_prediction = churn_prediction;
    }

    public double getChurn_probability() {
        return churn_probability;
    }

    public void setChurn_probability(double churn_probability) {
        this.churn_probability = churn_probability;
    }

    public String getRisk() {
        return risk;
    }

    public void setRisk(String risk) {
        this.risk = risk;
    }
}