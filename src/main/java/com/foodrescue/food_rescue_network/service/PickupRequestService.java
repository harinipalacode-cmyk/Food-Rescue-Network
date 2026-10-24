package com.foodrescue.food_rescue_network.service;

import com.foodrescue.food_rescue_network.entity.PickupRequest;
import com.foodrescue.food_rescue_network.repository.FoodDonationRepository;
import com.foodrescue.food_rescue_network.repository.PickupRequestRepository;
import com.foodrescue.food_rescue_network.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PickupRequestService {

    private final PickupRequestRepository requestRepository;
    private final FoodDonationRepository donationRepository;
    private final UserRepository userRepository;

    public PickupRequestService(
            PickupRequestRepository requestRepository,
            FoodDonationRepository donationRepository,
            UserRepository userRepository) {
        this.requestRepository = requestRepository;
        this.donationRepository = donationRepository;
        this.userRepository = userRepository;
    }

    public PickupRequest createRequest(PickupRequest request) {
        if (request.getDonation() == null
                || request.getDonation().getDonationId() == null
                || request.getRequester() == null
                || request.getRequester().getUserId() == null) {
            throw new IllegalArgumentException(
                    "Donation ID and requester ID are required");
        }

        var donation = donationRepository.findById(
                request.getDonation().getDonationId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Donation not found"));

        var requester = userRepository.findById(
                request.getRequester().getUserId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Requester not found"));

        if (!"NGO".equalsIgnoreCase(requester.getUserType())
                && !"VOLUNTEER".equalsIgnoreCase(
                        requester.getUserType())) {
            throw new IllegalArgumentException(
                    "Only NGOs and volunteers can request pickups");
        }

        if (!"AVAILABLE".equals(donation.getStatus())
                || donation.getAvailableFrom() == null
                || donation.getPickupDeadline() == null
                || donation.getAvailableFrom().isAfter(LocalDateTime.now())
                || !donation.getPickupDeadline()
                        .isAfter(LocalDateTime.now())) {
            throw new IllegalStateException(
                    "Donation is not currently available");
        }

        if (request.getRequestedQuantity() == null
                || request.getRequestedQuantity() <= 0
                || request.getRequestedQuantity() > donation.getQuantity()) {
            throw new IllegalArgumentException(
                    "Invalid requested quantity");
        }

        request.setDonation(donation);
        request.setRequester(requester);
        request.setRequestTime(LocalDateTime.now());
        request.setStatus("PENDING");

        return requestRepository.save(request);
    }

    public List<PickupRequest> getAllRequests() {
        return requestRepository.findAll();
    }

    public List<PickupRequest> getRequestsByDonation(Long donationId) {
        return requestRepository
                .findByDonation_DonationId(donationId);
    }

    @Transactional
    public PickupRequest approveRequest(Long requestId) {
        PickupRequest request = getRequest(requestId);

        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalStateException(
                    "Only pending requests can be approved");
        }

        var donation = donationRepository.findById(
                request.getDonation().getDonationId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Donation not found"));

        if (!"AVAILABLE".equals(donation.getStatus())
                || donation.getPickupDeadline() == null
                || !donation.getPickupDeadline()
                        .isAfter(LocalDateTime.now())
                || request.getRequestedQuantity() > donation.getQuantity()) {
            throw new IllegalStateException(
                    "Donation is no longer available");
        }

        request.setStatus("APPROVED");
        donation.setStatus("RESERVED");

        donationRepository.save(donation);
        return requestRepository.save(request);
    }

    public PickupRequest rejectRequest(Long requestId) {
        PickupRequest request = getRequest(requestId);

        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalStateException(
                    "Only pending requests can be rejected");
        }

        request.setStatus("REJECTED");
        return requestRepository.save(request);
    }

    @Transactional
    public PickupRequest completePickup(Long requestId) {
        PickupRequest request = getRequest(requestId);

        if (!"APPROVED".equals(request.getStatus())) {
            throw new IllegalStateException(
                    "Only approved requests can be completed");
        }

        var donation = donationRepository.findById(
                request.getDonation().getDonationId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Donation not found"));

        double remaining = donation.getQuantity()
                - request.getRequestedQuantity();

        if (remaining < 0) {
            throw new IllegalStateException("Insufficient quantity");
        }

        donation.setQuantity(remaining);
        donation.setStatus(remaining == 0 ? "COLLECTED" : "AVAILABLE");
        request.setStatus("COMPLETED");

        donationRepository.save(donation);
        return requestRepository.save(request);
    }

    public PickupRequest cancelRequest(Long requestId) {
        PickupRequest request = getRequest(requestId);

        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalStateException(
                    "Only pending requests can be cancelled");
        }

        request.setStatus("CANCELLED");
        return requestRepository.save(request);
    }

    private PickupRequest getRequest(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Pickup request not found: " + id));
    }
}