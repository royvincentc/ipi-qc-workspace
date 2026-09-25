import { getConfiguration, saveConfiguration } from './server/configuration.ts';

async function fix() {
  const config = await getConfiguration();
  const value = config.value;
  const product = value.products.find(p => p.name === 'De-identified Product A · 100 units');
  if (product) {
    product.aliases.push('Omega Pain Killer Liniment- Pro (5th withdrawal - New Specs)-60 mL - EXC01');
    await saveConfiguration(value, config.revision, 'system');
    console.log('Alias added');
  } else {
    console.log('Product not found');
  }
}
fix().catch(console.error);
