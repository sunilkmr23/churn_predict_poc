package com.example.churn.model;

public class PredictionRequest {

    private String plan;
    private double monthlyPrice;
    private int tenureMonths;
    private int outages;
    private int complaints;
    private int supportCalls;
    private int latePayments;
    private int competitorAvailable;
    private int monthlyContract;
    private int speedMbps;
    private int avgMonthlyUsageGb;
    private int recentPlanChange;
    private int contractRenewalDue;
    private String region;


    public int getAvgMonthlyUsageGb() {
        return avgMonthlyUsageGb;
    }

    public void setAvgMonthlyUsageGb(int avgMonthlyUsageGb) {
        this.avgMonthlyUsageGb = avgMonthlyUsageGb;
    }

    public int getContractRenewalDue() {
        return contractRenewalDue;
    }

    public void setContractRenewalDue(int contractRenewalDue) {
        this.contractRenewalDue = contractRenewalDue;
    }

    public int getRecentPlanChange() {
        return recentPlanChange;
    }

    public void setRecentPlanChange(int recentPlanChange) {
        this.recentPlanChange = recentPlanChange;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getPlan() {
        return plan;
    }

    public void setPlan(String plan) {
        this.plan = plan;
    }

    public double getMonthlyPrice() {
        return monthlyPrice;
    }

    public void setMonthlyPrice(double monthlyPrice) {
        this.monthlyPrice = monthlyPrice;
    }

    public int getTenureMonths() {
        return tenureMonths;
    }

    public void setTenureMonths(int tenureMonths) {
        this.tenureMonths = tenureMonths;
    }

    public int getOutages() {
        return outages;
    }

    public void setOutages(int outages) {
        this.outages = outages;
    }

    public int getComplaints() {
        return complaints;
    }

    public void setComplaints(int complaints) {
        this.complaints = complaints;
    }

    public int getSupportCalls() {
        return supportCalls;
    }

    public void setSupportCalls(int supportCalls) {
        this.supportCalls = supportCalls;
    }

    public int getLatePayments() {
        return latePayments;
    }

    public void setLatePayments(int latePayments) {
        this.latePayments = latePayments;
    }

    public int getCompetitorAvailable() {
        return competitorAvailable;
    }

    public void setCompetitorAvailable(int competitorAvailable) {
        this.competitorAvailable = competitorAvailable;
    }

    public int getMonthlyContract() {
        return monthlyContract;
    }

    public void setMonthlyContract(int monthlyContract) {
        this.monthlyContract = monthlyContract;
    }

    public int getSpeedMbps() {
        return speedMbps;
    }

    public void setSpeedMbps(int speedMbps) {
        this.speedMbps = speedMbps;
    }
}