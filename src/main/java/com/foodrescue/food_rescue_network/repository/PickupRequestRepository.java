package com.foodrescue.food_rescue_network.repository;

import com.foodrescue.food_rescue_network.entity.PickupRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PickupRequestRepository
        extends JpaRepository<PickupRequest, Long> {

    List<PickupRequest> findByDonation_DonationId(Long donationId);

    List<PickupRequest> findByRequester_UserId(Long requesterId);

    List<PickupRequest> findByStatus(String status);
}