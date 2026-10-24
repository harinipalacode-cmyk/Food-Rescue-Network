
package com.foodrescue.food_rescue_network.controller;

import com.foodrescue.food_rescue_network.entity.PickupRequest;
import com.foodrescue.food_rescue_network.service.PickupRequestService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pickups")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5501"
})
public class PickupRequestController {

    private final PickupRequestService requestService;

    public PickupRequestController(PickupRequestService requestService) {
        this.requestService = requestService;
    }

    @PostMapping
    public PickupRequest create(@RequestBody PickupRequest request) {
        return requestService.createRequest(request);
    }

    @GetMapping
    public List<PickupRequest> getAll() {
        return requestService.getAllRequests();
    }

    @GetMapping("/donation/{donationId}")
    public List<PickupRequest> getByDonation(
            @PathVariable Long donationId) {
        return requestService.getRequestsByDonation(donationId);
    }

    @PatchMapping("/{id}/approve")
    public PickupRequest approve(@PathVariable Long id) {
        return requestService.approveRequest(id);
    }

    @PatchMapping("/{id}/reject")
    public PickupRequest reject(@PathVariable Long id) {
        return requestService.rejectRequest(id);
    }

    @PatchMapping("/{id}/complete")
    public PickupRequest complete(@PathVariable Long id) {
        return requestService.completePickup(id);
    }

    @PatchMapping("/{id}/cancel")
    public PickupRequest cancel(@PathVariable Long id) {
        return requestService.cancelRequest(id);
    }
}
