/**
 * Dakly - ESM Entrypoint
 */
import DaklyCjs from './src/index.js';

export const Dakly = DaklyCjs.Dakly || DaklyCjs;
export const DaklyError = DaklyCjs.DaklyError;
export const DaklyAuthenticationError = DaklyCjs.DaklyAuthenticationError;
export const DaklyRateLimitError = DaklyCjs.DaklyRateLimitError;
export const DaklySuppressedError = DaklyCjs.DaklySuppressedError;
export const DaklyValidationError = DaklyCjs.DaklyValidationError;

export default Dakly;
