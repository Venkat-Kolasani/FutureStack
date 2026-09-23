'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

import { useAuthToken } from '../hooks/useAuthToken';
import { hackathonService } from '../services/api';

const AcceptTeamInvite = () => {
    const { token } = useParams();
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();
    const { isLoaded: tokenReady } = useAuthToken();
    const redemptionRef = useRef(null);
    const [error, setError] = useState('');
    const [retryTick, setRetryTick] = useState(0);

    useEffect(() => {
        if (!isLoaded || !tokenReady || !isSignedIn || !token) return;

        let cancelled = false;
        const attemptKey = `${token}:${retryTick}`;
        if (!redemptionRef.current || redemptionRef.current.key !== attemptKey) {
            redemptionRef.current = {
                key: attemptKey,
                promise: hackathonService.acceptInvite(token),
            };
        }

        redemptionRef.current.promise
            .then((result) => {
                if (cancelled) return;
                router.replace(`/hackathons/${result.opportunityId}`);
            })
            .catch((requestError) => {
                if (cancelled) return;
                const status = requestError.response?.status;
                if (status === 401 && retryTick < 2) {
                    redemptionRef.current = null;
                    setRetryTick((tick) => tick + 1);
                    return;
                }
                setError(
                    status === 404
                        ? 'This invite is invalid, expired, or has already been used.'
                        : 'We could not accept this invite. Please try again.'
                );
            });

        return () => {
            cancelled = true;
        };
    }, [isLoaded, tokenReady, isSignedIn, token, retryTick, router]);

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
                            onClick={() => router.push('/hackathons')}
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
