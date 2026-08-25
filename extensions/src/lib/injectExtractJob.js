import { extractJob } from './extractJob.js';

globalThis.__FT_EXTRACT_JOB__ = () => extractJob(document, window.location);

globalThis.__FT_GET_SELECTION__ = () => window.getSelection()?.toString() ?? '';
