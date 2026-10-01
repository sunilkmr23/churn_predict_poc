
package com.example.churn.controller;

import com.example.churn.model.Customer;
import com.example.churn.model.CustomerIdRequest;
import com.example.churn.model.PredictionRequest;
import com.example.churn.model.PredictionResponse;
import com.example.churn.service.CustomerFeatureMapper;
import com.example.churn.service.CustomerService;
import com.example.churn.service.PredictionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RestController
@RequestMapping("/api/churn")
public class CustomerController {

    private final CustomerService service;
    private final PredictionService predictionService;

    @Autowired
    private RestTemplate restTemplate;

    public CustomerController(CustomerService service, PredictionService predictionService) {
        this.service = service;
        this.predictionService = predictionService;
    }

    @GetMapping("/customers")
    public List<Customer> getCustomers() {
        return service.getAllCustomers();
    }

    @GetMapping("/churn-count")
    public long getChurnCount() {
        return service.getChurnCount();
    }

   /* @PostMapping("/predict")
    public double predict(@RequestBody Customer customer) {
        return predictionService.predictChurn(customer);
    }*/

    @PostMapping("/getchurndata")
    public List<PredictionResponse> predictAllCustomerId(@RequestBody PredictionRequest customer) {
        return new ArrayList<>();
    }

    @PostMapping("/predict-by-customer")
    public PredictionResponse predictByCustomerId(@RequestBody PredictionRequest customer) {
        return predictionService.predictChurn(customer);
    }

    @PostMapping("/predict-by-id")
    public PredictionResponse predictByCustomerIdFromDatabase(@RequestBody CustomerIdRequest request) {
        if (request == null || request.getCustomerId() == null || request.getCustomerId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customerId is required");
        }

        Map<String, Object> customerRow = service.getCustomerByIdFromRemoteDb(request.getCustomerId());
        if (customerRow == null || customerRow.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found for id: " + request.getCustomerId());
        }

        PredictionRequest predictionRequest = CustomerFeatureMapper.toPredictionRequest(customerRow);
        PredictionResponse response = predictionService.predictFromRemoteRecord(predictionRequest);
        response.setCustomer(customerRow);
        return response;
    }

    @GetMapping("/predict-by-id/{customerId}")
    public PredictionResponse predictByCustomerIdFromDatabase(@PathVariable String customerId) {
        if (customerId == null || customerId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customerId is required");
        }

        Map<String, Object> customerRow = service.getCustomerByIdFromRemoteDb(customerId);
        if (customerRow == null || customerRow.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found for id: " + customerId);
        }

        PredictionRequest predictionRequest = CustomerFeatureMapper.toPredictionRequest(customerRow);
        PredictionResponse response = predictionService.predictFromRemoteRecord(predictionRequest);
        response.setCustomer(customerRow);
        return response;
    }
}