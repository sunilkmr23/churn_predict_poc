package com.example.churn.model;

public class Customer {
    private String customerID;
    private String gender;
    private int tenure;
    private double monthlyCharges;
    private String contract;
    private String churn;

    public String getCustomerID() {
        return customerID;
    }

    public void setCustomerID(String customerID) {
        this.customerID = customerID;
    }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public int getTenure() { return tenure; }
    public void setTenure(int tenure) { this.tenure = tenure; }

    public double getMonthlyCharges() { return monthlyCharges; }
    public void setMonthlyCharges(double monthlyCharges) { this.monthlyCharges = monthlyCharges; }

    public String getContract() { return contract; }
    public void setContract(String contract) { this.contract = contract; }

    public String getChurn() { return churn; }
    public void setChurn(String churn) { this.churn = churn; }
}
