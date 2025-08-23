// InterviewForm.jsx
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { generateInterview, clearInterview } from '../features/interview/interview';

const InterviewForm = () => {
  const [formData, setFormData] = useState({
    role: '',
    level: '',
    type: 'balanced',
    techstack: '',
    amount: 5
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useDispatch();
  const { loading, error, interview } = useSelector((state) => state.interview);

  // Validate form data
  const validateForm = () => {
    const errors = {};
    
    if (!formData.role.trim()) {
      errors.role = 'Role is required';
    }
    
    if (!formData.level) {
      errors.level = 'Experience level is required';
    }
    
    if (formData.amount < 1 || formData.amount > 20) {
      errors.amount = 'Number of questions must be between 1 and 20';
    }

    if (formData.techstack && formData.techstack.length > 200) {
      errors.techstack = 'Tech stack description is too long';
    }

    return errors;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field-specific error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
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
        role: formData.role.trim(),
        techstack: formData.techstack.trim(),
        amount: parseInt(formData.amount, 10)
      };

      await dispatch(generateInterview(processedData)).unwrap();
      
      // Form will be reset by parent component or redirect will occur
    } catch (error) {
      console.error('Interview generation failed:', error);
      // Error will be handled by Redux state
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when component unmounts or interview is cleared
  useEffect(() => {
    return () => {
      if (interview) {
        dispatch(clearInterview());
      }
    };
  }, [dispatch, interview]);

  const levelOptions = [
    { value: '', label: 'Select Experience Level' },
    { value: 'Junior', label: 'Junior (0-2 years)' },
    { value: 'Mid-level', label: 'Mid-level (2-5 years)' },
    { value: 'Senior', label: 'Senior (5-8 years)' },
    { value: 'Lead', label: 'Lead (8+ years)' },
    { value: 'Executive', label: 'Executive/VP level' }
  ];

  const typeOptions = [
    { value: 'balanced', label: 'Balanced (Technical + Behavioral)' },
    { value: 'technical', label: 'Technical Focus' },
    { value: 'behavioural', label: 'Behavioral Focus' }
  ];

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        🎙️ Generate Interview
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role/Position *
          </label>
          <input
            type="text"
            placeholder="e.g., Backend Developer, Data Scientist"
            value={formData.role}
            onChange={(e) => handleInputChange('role', e.target.value)}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              formErrors.role ? 'border-red-400' : 'border-gray-300'
            }`}
            disabled={loading || isSubmitting}
          />
          {formErrors.role && (
            <p className="mt-1 text-sm text-red-600">{formErrors.role}</p>
          )}
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Experience Level *
          </label>
          <select
            value={formData.level}
            onChange={(e) => handleInputChange('level', e.target.value)}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              formErrors.level ? 'border-red-400' : 'border-gray-300'
            }`}
            disabled={loading || isSubmitting}
          >
            {levelOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {formErrors.level && (
            <p className="mt-1 text-sm text-red-600">{formErrors.level}</p>
          )}
        </div>

        {/* Interview Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interview Focus
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading || isSubmitting}
          >
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tech Stack */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tech Stack (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g., React, Node.js, PostgreSQL, AWS"
            value={formData.techstack}
            onChange={(e) => handleInputChange('techstack', e.target.value)}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              formErrors.techstack ? 'border-red-400' : 'border-gray-300'
            }`}
            disabled={loading || isSubmitting}
            maxLength="200"
          />
          <p className="mt-1 text-xs text-gray-500">
            Comma-separated technologies (optional)
          </p>
          {formErrors.techstack && (
            <p className="mt-1 text-sm text-red-600">{formErrors.techstack}</p>
          )}
        </div>

        {/* Number of Questions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Questions *
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              formErrors.amount ? 'border-red-400' : 'border-gray-300'
            }`}
            disabled={loading || isSubmitting}
          />
          {formErrors.amount && (
            <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            loading || isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200'
          } text-white`}
          disabled={loading || isSubmitting}
        >
          {loading || isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Interview...
            </span>
          ) : (
            'Generate Interview'
          )}
        </button>
      </form>

      {/* Success Message */}
      {interview && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <p className="text-sm">✅ Interview generated successfully! You can now start the interview.</p>
        </div>
      )}
    </div>
  );
};

export default InterviewForm;
