package com.foodrescue.food_rescue_network.service;

import com.foodrescue.food_rescue_network.entity.FoodDonation;
import com.foodrescue.food_rescue_network.repository.FoodDonationRepository;
import com.foodrescue.food_rescue_network.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class FoodDonationService {

    private final FoodDonationRepository donationRepository;
    private final UserRepository userRepository;

    public FoodDonationService(
            FoodDonationRepository donationRepository,
            UserRepository userRepository) {
        this.donationRepository = donationRepository;
        this.userRepository = userRepository;
    }

    public FoodDonation publishDonation(FoodDonation donation) {
        if (donation.getProvider() == null
                || donation.getProvider().getUserId() == null) {
            throw new IllegalArgumentException("Provider ID is required");
        }

        var provider = userRepository.findById(
                donation.getProvider().getUserId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Provider not found"));

        if (donation.getQuantity() == null
                || donation.getQuantity() <= 0) {
            throw new IllegalArgumentException(
                    "Quantity must be greater than zero");
        }

        if (donation.getAvailableFrom() == null
                || donation.getPickupDeadline() == null
                || !donation.getPickupDeadline()
                        .isAfter(donation.getAvailableFrom())) {
            throw new IllegalArgumentException(
                    "Pickup deadline must be after availability time");
        }

        donation.setProvider(provider);
        donation.setStatus("AVAILABLE");

        return donationRepository.save(donation);
    }

    public List<FoodDonation> getAvailableDonations() {
        expireOldDonations();
        return donationRepository.findByStatus("AVAILABLE");
    }

    public List<FoodDonation> searchByCategory(String category) {
        expireOldDonations();
        return donationRepository
                .findByFoodCategoryIgnoreCaseAndStatus(
                        category, "AVAILABLE");
    }

    public FoodDonation getDonationById(Long id) {
        expireOldDonations();

        return donationRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Donation not found"));
    }

    public FoodDonation cancelDonation(Long id) {
        FoodDonation donation = getDonationById(id);

        if (!"AVAILABLE".equals(donation.getStatus())) {
            throw new IllegalStateException(
                    "Only available donations can be cancelled");
        }

        donation.setStatus("CANCELLED");
        return donationRepository.save(donation);
    }

    public void expireOldDonations() {
        List<FoodDonation> donations =
                donationRepository.findByStatus("AVAILABLE");

        LocalDateTime now = LocalDateTime.now();

        for (FoodDonation donation : donations) {
            if (donation.getPickupDeadline() != null
                    && !donation.getPickupDeadline().isAfter(now)) {
                donation.setStatus("EXPIRED");
                donationRepository.save(donation);
            }
        }
    }
}