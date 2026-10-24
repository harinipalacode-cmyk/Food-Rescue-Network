
package com.foodrescue.food_rescue_network.service;

import com.foodrescue.food_rescue_network.entity.User;
import com.foodrescue.food_rescue_network.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User registerUser(User user) {
        if (user.getUserName() == null || user.getUserName().isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        if (user.getPassword() == null || user.getPassword().length() < 8) {
            throw new IllegalArgumentException(
                    "Password must contain at least 8 characters");
        }

        String email = user.getEmail().trim().toLowerCase(Locale.ROOT);
        user.setEmail(email);

        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        if (user.getUserType() == null) {
            throw new IllegalArgumentException("User type is required");
        }

        String type = user.getUserType().trim().toUpperCase(Locale.ROOT);

        if (!List.of("PROVIDER", "NGO", "RECEIVER").contains(type)) {
            throw new IllegalArgumentException("Invalid user type");
        }

        user.setUserType(type);
        user.setPasswordHash(passwordEncoder.encode(user.getPassword()));
        user.setPassword(null);

        return userRepository.save(user);
    }

    public User loginUser(String email, String password) {
        if (email == null || email.isBlank()
                || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Email and password are required");
        }

        User user = userRepository
                .findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() ->
                        new IllegalArgumentException("Invalid email or password"));

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        return user;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found: " + id));
    }
}
