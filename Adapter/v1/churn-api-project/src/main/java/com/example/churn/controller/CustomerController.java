
package com.example.churn.controller;

import com.example.churn.model.Customer;
import com.example.churn.model.PredictionRequest;
import com.example.churn.model.PredictionResponse;
import com.example.churn.service.CustomerService;
import com.example.churn.service.PredictionService;
import jakarta.websocket.server.PathParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

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
        // Customer c = service.getCustomer(customerId);
        //if( null != c) {
        //return predictionService.predictChurn(c);

        // } else {
        return new ArrayList<>();
        //}
    }

    @PostMapping("/predict-by-customer")
    public PredictionResponse predictByCustomerId(@RequestBody PredictionRequest customer) {
       // Customer c = service.getCustomer(customerId);
        //if( null != c) {
            //return predictionService.predictChurn(c);

       // } else {
            return predictionService.predictChurn(customer);
        //}
    }
}