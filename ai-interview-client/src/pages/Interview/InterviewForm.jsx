// InterviewForm.jsx
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  generateInterview,
  clearInterview,
} from "../../features/interview/interview";
import { logger } from "../../utils/logger";
import Select from "react-select";

const InterviewForm = () => {
  const [formData, setFormData] = useState({
    role: "Backend Developer",
    customRole: "",
    level: "",

    type: "balanced",
    techstack: [],
    amount: 5,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skills, setSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // role options
  const roleOptions = [
    { value: "backend_developer", label: "Backend Developer" },
    { value: "frontend_developer", label: "Frontend Developer" },
    { value: "fullstack_developer", label: "Full Stack Developer" },
    { value: "software_engineer", label: "Software Engineer" },
    { value: "machine_learning_engineer", label: "Machine Learning Engineer" },
    { value: "data_scientist", label: "Data Scientist" },
    { value: "devops_engineer", label: "DevOps Engineer" },
    { value: "mobile_developer", label: "Mobile Developer" },
    { value: "cloud_engineer", label: "Cloud Engineer" },
    { value: "other", label: "Other (Custom Role)" },
  ];

  const dispatch = useDispatch();
  const { loading, error, interview } = useSelector((state) => state.interview);

  // Manual reset function for stuck states
  const handleReset = () => {
    dispatch(clearInterview());
    setIsSubmitting(false);
    localStorage.removeItem("persist:root");
    window.location.reload();
  };

  // Validate form data

  const validateForm = () => {
    const errors = {};

   if (formData.role === "other" && !formData.customRole.trim()) {
  errors.role = "Please enter your role";
}

    if (!formData.level) {
      errors.level = "Experience level is required";
    }

    if (formData.amount < 1 || formData.amount > 20) {
      errors.amount = "Number of questions must be between 1 and 20";
    }

    if (formData.techstack.length > 20) {
      errors.techstack = "Tech stack description is too long";
    }

    return errors;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      // Process tech stack
      const processedData = {
        ...formData,
         role:
    formData.role === "other"
      ? formData.customRole.trim()
      : formData.role.replaceAll("_", " "),
        techstack: formData.techstack.map((skill) => skill.value),
        amount: parseInt(formData.amount, 10),
      };

      await dispatch(generateInterview(processedData)).unwrap();

      // Form will be reset by parent component or redirect will occur
    } catch (error) {
      logger.error("Interview generation failed:", error);
      // Error will be handled by Redux state
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoadingSkills(true);

        const res = await fetch(
          "https://api.stackexchange.com/2.3/tags?order=desc&sort=popular&site=stackoverflow&pagesize=100",
        );

        const data = await res.json();

        const formattedSkills = data.items.map((tag) => ({
          value: tag.name,
          label: tag.name,
        }));

        setSkills(formattedSkills);
      } catch (error) {
        logger.error("Failed to fetch skills", error);
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchSkills();
  }, []);

  // Reset form when component unmounts or interview is cleared
  useEffect(() => {
    // Clear any stuck loading state from localStorage on mount
    const persistedState = localStorage.getItem("persist:root");
    if (persistedState) {
      try {
        const parsed = JSON.parse(persistedState);
        if (parsed.interview) {
          const interviewState = JSON.parse(parsed.interview);
          if (interviewState.loading === true) {
            logger.log("🧹 Clearing stuck loading state from localStorage");
            interviewState.loading = false;
            interviewState.error = null;
            parsed.interview = JSON.stringify(interviewState);
            localStorage.setItem("persist:root", JSON.stringify(parsed));
            window.location.reload();
          }
        }
      } catch (e) {
        logger.error("Error cleaning localStorage:", e);
      }
    }

    return () => {
      if (interview) {
        dispatch(clearInterview());
      }
    };
  }, [dispatch, interview]);

  const levelOptions = [
    { value: "", label: "Select Experience Level" },
    { value: "Junior", label: "Junior (0-2 years)" },
    { value: "Mid-level", label: "Mid-level (2-5 years)" },
    { value: "Senior", label: "Senior (5-8 years)" },
    { value: "Lead", label: "Lead (8+ years)" },
    { value: "Executive", label: "Executive/VP level" },
  ];

  const typeOptions = [
    { value: "balanced", label: "Balanced (Technical + Behavioral)" },
    { value: "technical", label: "Technical Focus" },
    { value: "behavioural", label: "Behavioral Focus" },
  ];

  const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "hsl(var(--background))",
    borderColor: state.isFocused
      ? "hsl(var(--ring))"
      : "hsl(var(--border))",
    color: "hsl(var(--foreground))",
    boxShadow: "none",
    "&:hover": {
      borderColor: "hsl(var(--ring))"
    }
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "hsl(var(--background))",
    color: "hsl(var(--foreground))"
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "hsl(var(--muted))"
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "hsl(var(--foreground))"
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? "hsl(var(--muted))"
      : "transparent",
    color: "hsl(var(--foreground))",
  })
};

  return (
  <div className="max-w-xl mx-auto mt-12 p-8 bg-card text-card-foreground border border-border shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-6 text-center ">
       Generate Interview
      </h2>

      {error && (
        <div className="mb-4 p-3   rounded">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 ">
        {/* Role Input */}
        <div>
          <label className="block text-sm font-medium  mb-1">
            Role/Position *
          </label>
       <Select
  options={roleOptions}
  value={roleOptions.find(r => r.value === formData.role)}
  onChange={(selected) => handleInputChange("role", selected.value)}
  styles={{
    control: (base) => ({
      ...base,
      backgroundColor: "black",
      color: "white",
      borderColor: "#374151",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "black",
      color: "white",
    }),
    singleValue: (base) => ({
      ...base,
      color: "white",
    }),
  }}
/>

{formData.role === "other" && (
  <input
    type="text"
    placeholder="Enter custom role"
    value={formData.customRole}
    onChange={(e) => handleInputChange("customRole", e.target.value)}
    className="w-full mt-2 p-3 border rounded-lg"
  />
)}

         
          {formErrors.role && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {formErrors.role}
            </p>
          )}
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-sm font-medium  mb-1">
            Experience Level *
          </label>
  <Select
  options={levelOptions}
  value={levelOptions.find((l) => l.value === formData.level)}
  onChange={(selected) => handleInputChange("level", selected.value)}
  className={`w-full ${
    formErrors.level
      ? "border-red-400 dark:border-red-500"
      : "border-gray-300 dark:border-gray-600"
  }`}
  styles={{
    control: (base) => ({
      ...base,
      backgroundColor: "black",
      color: "white",
      borderColor: "#374151",
      minHeight: "48px",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "black",
      color: "white",
    }),
    singleValue: (base) => ({
      ...base,
      color: "white",
    }),
  }}
  isDisabled={loading || isSubmitting}
/>
          {formErrors.level && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {formErrors.level}
            </p>
          )}
        </div>

        {/* Interview Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Interview Focus
          </label>
     <Select
  options={typeOptions}
  value={typeOptions.find((t) => t.value === formData.type)}
  onChange={(selected) => handleInputChange("type", selected.value)}
 styles={{
    control: (base) => ({
      ...base,
      backgroundColor: "black",
      color: "white",
      borderColor: "#374151",
      minHeight: "48px",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "black",
      color: "white",
    }),
    singleValue: (base) => ({
      ...base,
      color: "white",
    }),
  }}
  isDisabled={loading || isSubmitting}
/>
        </div>

        {/* Tech Stack */}
        <div>
          <label className="block text-sm font-medium  mb-1">
            Tech Stack
          </label>
          <Select
           styles={{
    control: (base) => ({
      ...base,
      backgroundColor: "black",
      color: "white",
      borderColor: "#374151",
      minHeight: "48px",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "black",
      color: "white",
    }),
    singleValue: (base) => ({
      ...base,
      color: "white",
    }),
  }}
            isMulti
            options={skills}
            value={formData.techstack}
            onChange={(selected) => handleInputChange("techstack", selected)}
            placeholder={
              loadingSkills
                ? "Loading technologies..."
                : "Search technologies (React, Node, Docker...)"
            }
          />

          {formErrors.techstack && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {formErrors.techstack}
            </p>
          )}
        </div>

        {/* Number of Questions */}
        <div>
          <label className="block text-sm font-medium  mb-1">
            Number of Questions *
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={formData.amount}
            onChange={(e) => handleInputChange("amount", e.target.value)}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent   ${
              formErrors.amount
                ? "border-red-400 dark:border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
            disabled={loading || isSubmitting}
          />
          {formErrors.amount && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {formErrors.amount}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            loading || isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200"
          } text-white`}
          disabled={loading || isSubmitting}
        >
          {loading || isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 "
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating Interview...
            </span>
          ) : (
            "Generate Interview"
          )}
        </button>

        {/* Reset Button (shown when stuck) */}
        {(loading || isSubmitting) && (
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 px-4 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white mt-2"
          >
            Reset Form (Click if stuck)
          </button>
        )}
      </form>

      {/* Success Message */}
      {interview && (
        <div className="mt-4 p-3  rounded">
          <p className="text-sm">
            {" "}
            Interview generated successfully! You can now start the interview.
          </p>
        </div>
      )}
    </div>
  );
};

export default InterviewForm;
