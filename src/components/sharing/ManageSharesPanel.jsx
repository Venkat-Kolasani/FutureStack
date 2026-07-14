import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FaCopy, FaEye, FaLink, FaPlus, FaRegClock, FaTrashAlt } from 'react-icons/fa';
import Button from '../common/Button';
import Card from '../common/Card';
import { shareLinkService } from '../../services/api';

const formatDate = (value) => {
  if (!value) return 'No expiry';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isExpired = (share) => Boolean(share.expiresAt && new Date(share.expiresAt) <= new Date());

const getShareLabel = (share) => {
  if (share.primaryLabel) return share.primaryLabel;
  if (share.opportunityTitles?.length === 1) return share.opportunityTitles[0];
  if (share.opportunityTitles?.length > 1) {
    return `${share.opportunityTitles[0]} +${share.opportunityTitles.length - 1} more`;
  }
  const total = share.summary?.total || 0;
  return total === 1 ? '1 opportunity' : `${total} opportunities`;
};

const getShareScope = (share) => {
  if (share.summary?.total === 1) return 'Single';
  return `${share.summary?.total || 0} items`;
};

const ManageSharesPanel = ({ refreshKey = 0, onCreateShare }) => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchShares();
  }, [refreshKey]);

  const fetchShares = async () => {
    try {
      setLoading(true);
      const data = await shareLinkService.list();
      setShares(data);
    } catch (error) {
      console.error('Error fetching share links:', error);
      toast.error('Failed to load share links');
    } finally {
      setLoading(false);
    }
  };

  const revokeShare = async (id) => {
    try {
      setRevokingId(id);
      const revoked = await shareLinkService.revoke(id);
      setShares((current) =>
        current.map((share) => (share.id === id ? { ...share, ...revoked } : share))
      );
      setConfirmRevokeId(null);
      toast.success('Share link revoked');
    } catch (error) {
      console.error('Error revoking share link:', error);
      toast.error('Failed to revoke share link');
    } finally {
      setRevokingId(null);
    }
  };

  const copyShareLink = async (share) => {
    if (!share.url) {
      toast.info('This link was created before re-copy was supported. Generate a new link to copy it again.');
      return;
    }

    try {
      await navigator.clipboard.writeText(share.url);
      setCopiedId(share.id);
      toast.success('Link copied to clipboard');
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying share link:', error);
      toast.error('Copy failed. Please try again.');
    }
  };

  const activeShares = shares.filter((share) => share.isActive && !isExpired(share));

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
            <FaLink className="mr-2 text-blue-400" />
            Shared Links
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Read-only links you have created. Revoke access at any time.
          </p>
        </div>
        {onCreateShare && (
          <Button variant="outline" onClick={onCreateShare} className="w-full shrink-0 sm:w-auto">
            <FaPlus className="mr-2" size={12} />
            Share progress
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : activeShares.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-white/10 bg-white/[0.02] px-4 py-10 text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No active share links</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Share your full progress from here, or share a single internship from the Internships tab.
          </p>
          {onCreateShare && (
            <Button variant="secondary" onClick={onCreateShare} className="mt-4">
              <FaPlus className="mr-2" size={12} />
              Create share link
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
          <table className="hidden w-full table-fixed md:table">
            <colgroup>
              <col className="w-auto" />
              <col className="w-[108px]" />
              <col className="w-[108px]" />
              <col className="w-[64px]" />
              <col className="w-[152px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-white/[0.02] text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-medium">Shared content</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium text-center">Views</th>
                <th className="px-3 py-2.5 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {activeShares.map((share) => (
                <tr key={share.id}>
                  {confirmRevokeId === share.id ? (
                    <td colSpan={5} className="px-4 py-3">
                      <div className="flex flex-col gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Revoke <span className="font-medium text-gray-900 dark:text-white">{getShareLabel(share)}</span>?
                          This link will stop working immediately.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => setConfirmRevokeId(null)}
                            className="px-3 py-1.5 text-sm"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => revokeShare(share.id)}
                            disabled={revokingId === share.id}
                            className="px-3 py-1.5 text-sm"
                          >
                            {revokingId === share.id ? 'Revoking...' : 'Revoke'}
                          </Button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 align-middle">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{getShareLabel(share)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                            {getShareScope(share)}
                          </span>
                          {share.hasPasscode && (
                            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-xs text-purple-300">
                              Passcode
                            </span>
                          )}
                          {!share.canCopy && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-300">
                              Re-copy unavailable
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(share.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(share.expiresAt)}
                      </td>
                      <td className="px-4 py-3 align-middle text-center text-sm text-gray-600 dark:text-gray-400">
                        {share.viewCount || 0}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="secondary"
                            onClick={() => copyShareLink(share)}
                            disabled={!share.canCopy}
                            className="!px-2 !py-1 text-xs font-medium shadow-none"
                          >
                            <FaCopy className="mr-1" size={10} />
                            {copiedId === share.id ? 'Copied' : 'Copy'}
                          </Button>
                          <button
                            type="button"
                            onClick={() => setConfirmRevokeId(share.id)}
                            className="inline-flex items-center rounded-md border border-red-500/20 px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                          >
                            <FaTrashAlt className="mr-1" size={10} />
                            Revoke
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="divide-y divide-white/8 md:hidden">
            {activeShares.map((share) => (
              <div key={share.id} className="px-4 py-3">
                {confirmRevokeId === share.id ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Revoke <span className="font-medium text-gray-900 dark:text-white">{getShareLabel(share)}</span>?
                      This link will stop working immediately.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setConfirmRevokeId(null)} className="px-3 py-1.5 text-sm">
                        Cancel
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => revokeShare(share.id)}
                        disabled={revokingId === share.id}
                        className="px-3 py-1.5 text-sm"
                      >
                        {revokingId === share.id ? 'Revoking...' : 'Revoke'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{getShareLabel(share)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                        {getShareScope(share)}
                      </span>
                      {share.hasPasscode && (
                        <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-xs text-purple-300">Passcode</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span>Created {formatDate(share.createdAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        <FaRegClock size={10} />
                        {formatDate(share.expiresAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FaEye size={10} />
                        {share.viewCount || 0} views
                      </span>
                    </div>
                    <div className="mt-3 flex justify-center gap-1.5">
                      <Button
                        variant="secondary"
                        onClick={() => copyShareLink(share)}
                        disabled={!share.canCopy}
                        className="!px-2 !py-1 text-xs font-medium shadow-none"
                      >
                        <FaCopy className="mr-1" size={10} />
                        {copiedId === share.id ? 'Copied' : 'Copy'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setConfirmRevokeId(share.id)}
                        className="inline-flex items-center rounded-md border border-red-500/20 px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                      >
                        <FaTrashAlt className="mr-1" size={10} />
                        Revoke
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ManageSharesPanel;
