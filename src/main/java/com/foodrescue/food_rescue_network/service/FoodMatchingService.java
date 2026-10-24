package com.foodrescue.food_rescue_network.service;

import com.foodrescue.food_rescue_network.entity.FoodDonation;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
public class FoodMatchingService {

    private final FoodDonationService donationService;

    public FoodMatchingService(FoodDonationService donationService) {
        this.donationService = donationService;
    }

    public List<FoodDonation> findMatches(
            String category,
            Double minimumQuantity,
            String location) {

        return donationService.getAvailableDonations()
                .stream()
                .filter(d -> category == null || category.isBlank()
                        || category.equalsIgnoreCase(d.getFoodCategory()))
                .filter(d -> minimumQuantity == null
                        || d.getQuantity() >= minimumQuantity)
                .filter(d -> location == null || location.isBlank()
                        || (d.getPickupLocation() != null
                        && d.getPickupLocation().toLowerCase()
                        .contains(location.toLowerCase())))
                .filter(d -> d.getAvailableFrom() != null
                        && !d.getAvailableFrom()
                        .isAfter(LocalDateTime.now()))
                .sorted(Comparator.comparing(
                        FoodDonation::getPickupDeadline))
                .toList();
    }
}