import crypto from 'crypto';

/**
 * Generate a Gravatar URL from an email address
 * @param email - The email address
 * @param size - The size of the image (default: 80)
 * @param defaultImage - Default image type if no Gravatar found (default: 'identicon')
 * @returns The Gravatar URL
 */
export function getGravatarUrl(
  email: string, 
  size: number = 80, 
  defaultImage: string = 'identicon'
): string {
  // Normalize email: trim whitespace and convert to lowercase
  const normalizedEmail = email.trim().toLowerCase();
  
  // Generate MD5 hash of the email
  const hash = crypto.createHash('md5').update(normalizedEmail).digest('hex');
  
  // Construct the Gravatar URL
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
}

/**
 * Generate a Gravatar URL with retina support (2x size)
 * @param email - The email address
 * @param size - The base size of the image
 * @param defaultImage - Default image type if no Gravatar found
 * @returns The Gravatar URL at 2x resolution
 */
export function getGravatarUrlRetina(
  email: string, 
  size: number = 80, 
  defaultImage: string = 'identicon'
): string {
  return getGravatarUrl(email, size * 2, defaultImage);
}
