/** Common Nigerian banks (code used for display / Bachs destination) */
export const NG_BANKS = [
  { code: '058', name: 'GTBank' },
  { code: '033', name: 'UBA' },
  { code: '011', name: 'First Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '044', name: 'Access Bank' },
  { code: '221', name: 'Stanbic IBTC' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '214', name: 'FCMB' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '050', name: 'Ecobank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '100', name: 'Suntrust' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '103', name: 'Globus Bank' },
  { code: '000', name: 'Other / specify' },
];

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({ banks: NG_BANKS });
}
