package com.example.churn.service;

import com.example.churn.model.PredictionRequest;
import com.example.churn.model.PredictionResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class PredictionService {

    @Autowired
    RestTemplate restTemplate;

    public PredictionResponse predictChurn(PredictionRequest request) {
        return restTemplate.postForObject(
                "http://localhost:8000/predict",
                request,
                PredictionResponse.class);
    }

    public PredictionResponse predictFromRemoteRecord(PredictionRequest request) {
        return restTemplate.postForObject(
                "http://localhost:8000/predict-from-record",
                request,
                PredictionResponse.class);
    }
}