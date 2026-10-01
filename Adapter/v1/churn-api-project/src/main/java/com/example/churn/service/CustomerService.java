package com.example.churn.service;

import com.example.churn.model.Customer;
import com.opencsv.CSVReader;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.FileReader;
import java.util.*;

@Service
public class CustomerService {

    private final JdbcTemplate jdbcTemplate;
    private List<Customer> customers = new ArrayList<>();

    public CustomerService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void loadData() {
        try {
            CSVReader reader = new CSVReader(new FileReader("data/WA_Fn-UseC_-Telco-Customer-Churn.csv"));
            String[] line;
            reader.readNext();

            while ((line = reader.readNext()) != null) {
                Customer c = new Customer();
                c.setCustomerID(line[0]);
                c.setGender(line[1]);
                c.setTenure(Integer.parseInt(line[5]));
                c.setMonthlyCharges(Double.parseDouble(line[18]));
                c.setContract(line[15]);
                c.setChurn(line[20]);
                customers.add(c);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public Map<String, Object> getCustomerByIdFromRemoteDb(String customerId) {
        String sql = "SELECT " +
                "CustomerID, CustomerName, Plan, MonthlyPrice, TenureMonths, Outages, Complaints, SupportCalls, " +
                "LatePayments, CompetitorAvailable, MonthlyContract, SpeedMBPS, AvgMonthlyUsageGb, RecentPlanChange, " +
                "ContractRenewalDue, Region " +
                "FROM R_INT_CA_CHURN_PARAMS WHERE CustomerID = ?";

        try {
            return jdbcTemplate.queryForMap(sql, customerId);
        } catch (EmptyResultDataAccessException exception) {
            return null;
        }
    }

    public List<Customer> getAllCustomers() {
        return customers;
    }

    public Customer getCustomer(String id) {
        return Optional.ofNullable(customers)
                .orElse(Collections.emptyList())
                .stream()
                .filter(Objects::nonNull)
                .filter(c -> id.equalsIgnoreCase(c.getCustomerID()))
                .findAny()
                .orElse(null);
    }

    public long getChurnCount() {
        return customers.stream()
                .filter(c -> "Yes".equalsIgnoreCase(c.getChurn()))
                .count();
    }
}
