
package com.foodrescue.food_rescue_network.repository;

import com.foodrescue.food_rescue_network.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);
}
