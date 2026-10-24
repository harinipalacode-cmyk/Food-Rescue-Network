package com.foodrescue.food_rescue_network.controller;

import com.foodrescue.food_rescue_network.entity.FoodDonation;
import com.foodrescue.food_rescue_network.service.FoodDonationService;
import com.foodrescue.food_rescue_network.service.FoodMatchingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/donations")
@CrossOrigin(origins = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501"
})
public class FoodDonationController {

    private final FoodDonationService donationService;
    private final FoodMatchingService matchingService;

    public FoodDonationController(
            FoodDonationService donationService,
            FoodMatchingService matchingService) {
        this.donationService = donationService;
        this.matchingService = matchingService;
    }

    @PostMapping
    public FoodDonation publish(@RequestBody FoodDonation donation) {
        return donationService.publishDonation(donation);
    }

    @GetMapping
    public List<FoodDonation> getAvailable() {
        return donationService.getAvailableDonations();
    }

    @GetMapping("/{id}")
    public FoodDonation getById(@PathVariable Long id) {
        return donationService.getDonationById(id);
    }

    @GetMapping("/category/{category}")
    public List<FoodDonation> searchByCategory(
            @PathVariable String category) {
        return donationService.searchByCategory(category);
    }

    @GetMapping("/match")
    public List<FoodDonation> findMatches(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Double minimumQuantity,
            @RequestParam(required = false) String location) {
        return matchingService.findMatches(
                category, minimumQuantity, location);
    }

    @PatchMapping("/{id}/cancel")
    public FoodDonation cancel(@PathVariable Long id) {
        return donationService.cancelDonation(id);
    }
}