document.addEventListener("DOMContentLoaded", function () {
  // Form elements
  const form = document.getElementById("registration-form");
  const formSteps = document.querySelectorAll(".form-step");
  const progressBar = document.querySelector(".progress-bar");
  const progressSteps = document.querySelectorAll(".step");
  const nextButtons = document.querySelectorAll(".next-btn");
  const prevButtons = document.querySelectorAll(".prev-btn");
  const submitButton = document.querySelector(".submit-btn");
  const successModal = document.getElementById("success-modal");
  const closeModalButton = document.querySelector(".close-modal");
  const printButton = document.querySelector(".print-btn");

  // File upload elements
  const photoUpload = document.getElementById("photo-upload");
  const photoPreview = document.getElementById("photo-preview");
  const photoFileInfo = photoUpload.nextElementSibling.nextElementSibling;
  const idUpload = document.getElementById("id-upload");
  const idFileInfo = idUpload.nextElementSibling.nextElementSibling;

  // Summary elements
  const summaryName = document.getElementById("summary-name");
  const summaryDob = document.getElementById("summary-dob");
  const summaryGender = document.getElementById("summary-gender");
  const summaryEmail = document.getElementById("summary-email");
  const summaryPhone = document.getElementById("summary-phone");
  const summaryAddress = document.getElementById("summary-address");
  const summaryTicket = document.getElementById("summary-ticket");
  const summaryAmount = document.getElementById("summary-amount");
  const confirmEmail = document.getElementById("confirm-email");
  const registrationId = document.getElementById("registration-id");

  let currentStep = 0;

  // Initialize form
  function initForm() {
    showStep(currentStep);
    updateProgressBar();

    // Set up phone number formatting
    const phoneInput = document.getElementById("phone");
    phoneInput.addEventListener("input", formatPhoneNumber);

    // Set up date picker (would use a library like flatpickr in production)
    const dobInput = document.getElementById("dob");
    const today = new Date();
    const minDate = new Date(
      today.getFullYear() - 100,
      today.getMonth(),
      today.getDate()
    );
    const maxDate = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );
    dobInput.min = formatDate(minDate);
    dobInput.max = formatDate(maxDate);

    // Set up file upload previews
    photoUpload.addEventListener("change", function (e) {
      handleFileUpload(e, photoPreview, photoFileInfo);
    });

    idUpload.addEventListener("change", function (e) {
      handleFileUpload(e, null, idFileInfo);
    });
  }

  // Show current step
  function showStep(stepIndex) {
    formSteps.forEach((step, index) => {
      step.classList.toggle("active", index === stepIndex);
    });

    progressSteps.forEach((step, index) => {
      if (index < stepIndex) {
        step.classList.add("completed");
        step.classList.remove("active");
      } else if (index === stepIndex) {
        step.classList.add("active");
        step.classList.remove("completed");
      } else {
        step.classList.remove("active", "completed");
      }
    });
  }

  // Update progress bar
  function updateProgressBar() {
    const progressPercent = (currentStep / (formSteps.length - 1)) * 100;
    progressBar.style.width = `${progressPercent}%`;
  }

  // Next button click handler
  nextButtons.forEach((button) => {
    button.addEventListener("click", function () {
      if (validateStep(currentStep)) {
        currentStep++;
        showStep(currentStep);
        updateProgressBar();

        // Scroll to top of form
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    });
  });

  // Previous button click handler
  prevButtons.forEach((button) => {
    button.addEventListener("click", function () {
      currentStep--;
      showStep(currentStep);
      updateProgressBar();

      // Scroll to top of form
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  });

  // Validate current step
  function validateStep(stepIndex) {
    let isValid = true;
    const currentStep = formSteps[stepIndex];
    const inputs = currentStep.querySelectorAll(
      "input[required], select[required]"
    );

    // Reset error messages
    currentStep.querySelectorAll(".error-message").forEach((msg) => {
      msg.style.display = "none";
    });

    inputs.forEach((input) => {
      if (!input.value.trim()) {
        showError(input, "This field is required");
        isValid = false;
      } else if (input.type === "email" && !validateEmail(input.value)) {
        showError(input, "Please enter a valid email address");
        isValid = false;
      } else if (input.id === "phone" && !validatePhone(input.value)) {
        showError(input, "Please enter a valid phone number");
        isValid = false;
      }
    });

    // Special validation for file upload
    if (stepIndex === 2 && !photoUpload.files[0]) {
      showError(photoUpload, "Profile photo is required");
      isValid = false;
    }

    return isValid;
  }

  // Show error message
  function showError(input, message) {
    const errorElement = input
      .closest(".form-group")
      .querySelector(".error-message");
    errorElement.textContent = message;
    errorElement.style.display = "block";
    input.style.borderColor = "var(--error-color)";

    // Scroll to the first error
    if (window.innerWidth > 768) {
      errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      errorElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // Email validation
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // Phone validation
  function validatePhone(phone) {
    // Simple validation - at least 10 digits
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 10;
  }

  // Format phone number as user types
  function formatPhoneNumber() {
    const phoneInput = document.getElementById("phone");
    let phoneNumber = phoneInput.value.replace(/\D/g, "");

    if (phoneNumber.length > 0) {
      phoneNumber = phoneNumber.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      phoneInput.value = !phoneNumber[2]
        ? phoneNumber[1]
        : `(${phoneNumber[1]}) ${phoneNumber[2]}` +
          (phoneNumber[3] ? `-${phoneNumber[3]}` : "");
    }
  }

  // Format date for input field
  function formatDate(date) {
    const d = new Date(date);
    let month = "" + (d.getMonth() + 1);
    let day = "" + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [year, month, day].join("-");
  }

  // Handle file upload and preview
  function handleFileUpload(event, previewElement, fileInfoElement) {
    const file = event.target.files[0];

    if (file) {
      fileInfoElement.textContent = file.name;

      if (previewElement) {
        const reader = new FileReader();
        reader.onload = function (e) {
          previewElement.src = e.target.result;
          previewElement.parentElement.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
      }
    } else {
      fileInfoElement.textContent = "No file chosen";
      if (previewElement) {
        previewElement.parentElement.classList.add("hidden");
      }
    }
  }

  // Form submission
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Validate final step
    if (validateStep(currentStep)) {
      // Validate terms checkbox
      const termsCheckbox = document.getElementById("terms");
      if (!termsCheckbox.checked) {
        showError(termsCheckbox, "You must accept the terms and conditions");
        return;
      }

      // Update summary with form data
      updateSummary();

      // In a real application, you would send the form data to the server here
      // For this demo, we'll just show the success modal
      showSuccessModal();
    }
  });

  // Update summary with form data
  function updateSummary() {
    // Personal info
    summaryName.textContent = `${document.getElementById("first-name").value} ${
      document.getElementById("last-name").value
    }`;
    summaryDob.textContent = formatDisplayDate(
      document.getElementById("dob").value
    );
    summaryGender.textContent =
      document.querySelector('input[name="gender"]:checked')?.value ||
      "Not specified";

    // Contact info
    summaryEmail.textContent = document.getElementById("email").value;
    confirmEmail.textContent = document.getElementById("email").value;
    summaryPhone.textContent = document.getElementById("phone").value;

    const addressParts = [
      document.getElementById("address").value,
      document.getElementById("city").value,
      document.getElementById("country").value,
    ]
      .filter((part) => part)
      .join(", ");

    summaryAddress.textContent = addressParts || "Not provided";

    // Ticket info
    const ticketType = document.querySelector(
      'input[name="ticket-type"]:checked'
    ).value;
    summaryTicket.textContent =
      ticketType.charAt(0).toUpperCase() + ticketType.slice(1);

    let amount = "Free";
    if (ticketType === "standard") amount = "$99.00";
    if (ticketType === "vip") amount = "$199.00";
    summaryAmount.textContent = amount;

    // Generate random registration ID
    registrationId.textContent =
      "REG-" + Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  // Format date for display
  function formatDisplayDate(dateString) {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  // Show success modal
  function showSuccessModal() {
    successModal.style.display = "flex";
  }

  // Close modal
  closeModalButton.addEventListener("click", function () {
    successModal.style.display = "none";
  });

  // Print button handler
  printButton.addEventListener("click", function () {
    // In a real application, this would generate and print the badge
    alert("Badge printing functionality would be implemented here");
  });

  // Close modal when clicking outside
  window.addEventListener("click", function (e) {
    if (e.target === successModal) {
      successModal.style.display = "none";
    }
  });

  // Initialize the form
  initForm();
});
