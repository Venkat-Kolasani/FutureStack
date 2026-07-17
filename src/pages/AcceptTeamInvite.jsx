import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

import { hackathonService } from '../services/api';

const AcceptTeamInvite = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const redeemed = useRef(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (redeemed.current) return;
        redeemed.current = true;

        const redeemInvite = async () => {
            try {
                const result = await hackathonService.acceptInvite(token);
                navigate(`/hackathons/${result.opportunityId}`, { replace: true });
            } catch (requestError) {
                const status = requestError.response?.status;
                setError(
                    status === 404
                        ? 'This invite is invalid, expired, or has already been used.'
                        : 'We could not accept this invite. Please try again.'
                );
            }
        };

        redeemInvite();
    }, [navigate, token]);

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0A0A0A] p-8 text-center">
                {error ? (
                    <>
                        <FaExclamationTriangle className="mx-auto mb-4 text-3xl text-amber-400" />
                        <h1 className="text-xl font-semibold">Invite unavailable</h1>
                        <p className="mt-3 text-gray-400">{error}</p>
                        <button
                            type="button"
                            onClick={() => navigate('/hackathons')}
                            className="mt-6 rounded-lg bg-purple-600 px-4 py-2 font-medium hover:bg-purple-500"
                        >
                            Go to hackathons
                        </button>
                    </>
                ) : (
                    <>
                        <FaCheckCircle className="mx-auto mb-4 text-3xl text-purple-400" />
                        <h1 className="text-xl font-semibold">Joining workspace</h1>
                        <p className="mt-3 text-gray-400">Your account access is being verified.</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default AcceptTeamInvite;
