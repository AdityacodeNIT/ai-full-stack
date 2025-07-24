import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { generateInterview,clearInterview } from '../features/interview/interview';


const InterviewForm = () => {
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [type, setType] = useState('balanced');
  const [techstack, setTechstack] = useState('');
  const [amount, setAmount] = useState(5);

  const dispatch = useDispatch();


  const { loading, error } = useSelector((state) => state.interview);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = { role, level, type, techstack, amount };

    dispatch(generateInterview(formData));
  };



  // useEffect(() => {
  //   return () => {
  //     dispatch(clearInterview()); // Clear state on unmount
  //   };
  // }, [dispatch]);

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4 text-center">🎙️ Generate Interview</h2>

      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Role (e.g. Backend Developer)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />

        <select
          
          placeholder="Experience Level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          required
          className="w-full p-2 border rounded"
          >
                <option value="Junior">Junior</option>
          <option value="Mid-level">Mid-level</option>
          <option value="Senior">Senior</option>
             <option value="Lead">Lead</option>
          <option value="Executive">Executive</option>

          </select>
        

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="balanced">a balance</option>
          <option value="technical">technical</option>
          <option value="behavioural">behavioral</option>
        </select>

        <input
          type="text"
          placeholder="Tech Stack (comma-separated)"
          value={techstack}
          onChange={(e) => setTechstack(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <input
          type="number"
          placeholder="Number of Questions"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={1}
          max={20}
          required
          className="w-full p-2 border rounded"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Interview'}
        </button>
      </form>
    </div>
  );
};

export default InterviewForm;
