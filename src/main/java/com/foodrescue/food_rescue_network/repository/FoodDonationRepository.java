package com.foodrescue.food_rescue_network.repository;

import com.foodrescue.food_rescue_network.entity.FoodDonation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FoodDonationRepository
        extends JpaRepository<FoodDonation, Long> {

    List<FoodDonation> findByStatus(String status);

    List<FoodDonation> findByFoodCategoryIgnoreCaseAndStatus(
            String foodCategory, String status);
}
