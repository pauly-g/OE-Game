/**
 * Comprehensive Profanity Word List
 * 
 * This file contains an extensive list of profane words, inappropriate content,
 * competitor names, and variations to be used by the profanity filter.
 * Sources: Multiple GitHub repositories and manual curation for business context.
 */

// Using a function to build the comprehensive list
const buildProfanityList = (): string[] => {
  // Safe words that should never be flagged, even if they contain substrings that look like profanity
  const safeWords = [
    'order editing', 'orderediting', 'order-editing', 'orderediting.com', 'orderEditing.com',
    'test', 'testing', 'testy', 'contest', 'protest', 'testify', 'testimony', 'testament', 'testable',
    'analysis', 'analyze', 'analytical', 'analyst', 'analyses', 'analyzing',  
    'assist', 'assistant', 'assisted', 'assisting', 'assistance', 'associate', 'association',
    'class', 'classic', 'classical', 'classify', 'classification', 'classes',
    'assess', 'assessed', 'assessing', 'assessment', 'assets', 'assignment', 'assign', 'assigned',
    'assume', 'assumed', 'assuming', 'assumption', 'assumptions',
    'passport', 'massachusetts', 'cassette', 'assemble', 'assembled', 'assembling', 'assembly',
    'glasses', 'grass', 'brass', 'therapist', 'pass', 'passing', 'passed', 'passenger',
    'bassist', 'chassis', 'harassment', 'embarrass', 'embarrassing', 'embassy',
    'sassy', 'grassy', 'sass', 'sassing', 'masse', 'lassie', 'hassle',
    'cockatoo', 'cockatiel', 'cocktail', 'peacock', 'hancock', 'hitchcock', 'woodcock',
    'hellenic', 'shellfish', 'hello', 'hellos', 'hell-bent',
    'mass', 'masses', 'massive', 'bass', 'bassoon', 'carcass', 'sass', 'hassle',
    'assassin', 'sassafras', 'casserole', 'assay', 'assail', 'amass', 'cuirass', 'bagasse',
    'canal', 'canals', 'banal', 'analysis', 'analyses', 'analyst', 'scunthorpe', 'penistone'
  ];
  
  // Comprehensive profanity list - Major categories
  const profanityWords = [
    // Basic profanity
    'fuck', 'fucking', 'fucker', 'fucked', 'fucks', 'fuk', 'fack', 'feck', 'phuck', 'phuk',
    'shit', 'shitting', 'shitter', 'shits', 'shat', 'shite', 'bullshit', 'horseshit', 'batshit',
    'cunt', 'cunts', 'cunting', 'cuntface', 'cuntbag',
    'bitch', 'bitches', 'bitching', 'bitchy', 'biotch', 'biatch', 'beatch',
    'ass', 'arse', 'asshole', 'arsehole', 'assholes', 'arseholes', 'asses', 'asshat', 'asswipe',
    'damn', 'damned', 'dammit', 'damnit', 'goddamn', 'goddamned', 'goddam',
    'piss', 'pissed', 'pissing', 'pisser', 'pissant', 'pissoff',
    'cock', 'cocks', 'cocksucker', 'cocksucking', 'cockhead', 'cockface',
    'dick', 'dicks', 'dickhead', 'dickface', 'dickwad', 'dickweed',
    'pussy', 'pussies', 'pussycat', 'pussi', 'pussey',
    'bastard', 'bastards', 'bstrd',
    'slut', 'sluts', 'slutty', 'sloot', 'sloots',
    'whore', 'whores', 'whor', 'hore',
    'tits', 'tit', 'titties', 'titty', 'boobs', 'boob', 'booby', 'boobies',
    'penis', 'penises', 'penis', 'penus', 'peen',
    'vagina', 'vaginas', 'vag', 'vajayjay',
    'anal', 'anus', 'anuses', 'butthole', 'buthole',
    
    // Childish/mild profanity that should still be blocked
    'poo', 'poop', 'poopy', 'poopoo', 'pooey', 'pooh', 'poop', 'crap', 'crappy', 'crapper',
    'fart', 'farting', 'farts', 'farted', 'farter',
    'butt', 'butts', 'buttface', 'butthead', 'buttcheek', 'buttcheeks',
    'booty', 'bootie', 'bootyhole',
    'wee', 'weewee', 'peepee', 'pee', 'peeing',
    'stupid', 'idiot', 'idiotic', 'moron', 'moronic', 'dumb', 'dumbass', 'dumbo',
    'loser', 'losers', 'suck', 'sucks', 'sucking', 'sucky',
    
    // Derogatory terms
    'retard', 'retarded', 'retards', 'tard', 'tards',
    'gay', 'gays', 'fag', 'faggot', 'faggots', 'fags', 'homo', 'homos',
    'dyke', 'dykes', 'lesbian', 'lesbo', 'lesbos',
    'tranny', 'trannies', 'shemale', 'shemales',
    'nigger', 'niggers', 'nigga', 'niggas', 'negro', 'negroes',
    'chink', 'chinks', 'gook', 'gooks', 'jap', 'japs',
    'spic', 'spics', 'wetback', 'wetbacks', 'beaner', 'beaners',
    'kike', 'kikes', 'hymie', 'hymies',
    'towelhead', 'towelheads', 'raghead', 'ragheads',
    'cracker', 'crackers', 'honkey', 'honky', 'whitey',
    
    // Sexual terms
    'sex', 'sexy', 'sexual', 'porn', 'porno', 'pornography', 'xxx',
    'masturbate', 'masturbating', 'masturbation', 'jerkoff', 'jackoff',
    'orgasm', 'orgasms', 'climax', 'cumming', 'cum', 'jizz', 'spunk',
    'blowjob', 'blowjobs', 'fellatio', 'cunnilingus', 'rimjob',
    'dildo', 'dildos', 'vibrator', 'vibrators', 'fleshlight',
    'hooker', 'hookers', 'prostitute', 'prostitutes', 'escort', 'escorts',
    
    // Violence/threats
    'kill', 'killing', 'murder', 'die', 'death', 'dead', 'suicide',
    'rape', 'raping', 'rapist', 'molest', 'molesting', 'molester',
    'terrorist', 'terrorism', 'bomb', 'bombing', 'shooter', 'shooting',
    
    // Drugs
    'weed', 'marijuana', 'cannabis', 'pot', 'dope', 'hash', 'cocaine', 'crack',
    'heroin', 'meth', 'methamphetamine', 'ecstasy', 'lsd', 'acid',
    'drunk', 'wasted', 'hammered', 'shitfaced', 'fuckedup',
    
    // Negative phrases about Order Editing or business
    'sucks', 'suck', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'hated',
    'scam', 'scammer', 'fraud', 'fraudulent', 'ripoff', 'rip-off', 'steal', 'stolen',
    'useless', 'worthless', 'garbage', 'trash', 'junk', 'crap',
    
    // Common misspellings and variations
    'fuk', 'fack', 'phuck', 'shyt', 'shiit', 'azz', 'asz', 'buttocks',
    'biatch', 'beotch', 'biotch', 'byatch', 'beatch',
    'darn', 'dang', 'dangit', 'shoot', 'shucks', 'fudge', 'frick', 'fricking',
    
    // Leet speak variations
    'f*ck', 'f**k', 'sh*t', 'sh**', 'a**', 'a**hole', 'b*tch', 'b**ch',
    'f4ck', 'fvck', 'phvck', 'sh1t', 'sh!t', '@ss', '@sshole', 'b1tch', 'b!tch',
    
    // Additional inappropriate content
    'pervert', 'perverted', 'perv', 'creep', 'creepy', 'creeper',
    'pedophile', 'pedo', 'predator', 'stalker', 'stalking',
    'incest', 'incestuous', 'bestiality', 'zoophilia',
    'fetish', 'kinky', 'bdsm', 'bondage', 'dominatrix',
    
    // Scatological
    'puke', 'vomit', 'barf', 'upchuck', 'hurl', 'ralph',
    'snot', 'booger', 'boogers', 'mucus', 'phlegm',
    'urine', 'urinate', 'urinating', 'pee', 'peeing', 'piss', 'pissing'
  ];

  // Shopify App Store Competitors from the screenshot and other known competitors
  const competitors = [
    // Direct competitors from the Shopify App Store screenshot
    'syncx', 'sync x', 'syncx order export', 'sync-x',
    'toole', 'tool e', 'toole amazon easy sync', 'amazon easy sync',
    'cleverific', 'cleverific order editing', 'clever-ific',
    'revize', 'revize order editing', 'revize order editing upsell',
    'ae order editing', 'ae order editing upsell', 'ae-order-editing',
    'postsell', 'post sell', 'postsell order editing upsell', 'post-sell',
    'eoe', 'eoe easy order editing', 'easy order editing',
    'recheck', 'recheck edit order', 'recheck edit order upsell', 're-check',
    'orderify', 'order-ify', 'orderify order edit cancel',
    'ot easy order editing', 'ot order editing', 'order-t',
    
    // Competitor variations with prefixes that should be blocked
    'ae: order editing', 'ae:order editing', 'ae order editing', 'ae-order-editing', 'ae_order_editing',
    'oe: order editing', 'oe:order editing', 'oe order editing', 'oe-order-editing', 'oe_order_editing',
    'ae: order editing upsell', 'ae:order editing upsell', 'ae order editing upsell',
    'oe: order editing upsell', 'oe:order editing upsell', 'oe order editing upsell',
    'ae order edit', 'ae:order edit', 'ae: order edit', 'ae-order-edit',
    'oe order edit', 'oe:order edit', 'oe: order edit', 'oe-order-edit',
    'ae edit order', 'ae:edit order', 'ae: edit order', 'ae-edit-order',
    'oe edit order', 'oe:edit order', 'oe: edit order', 'oe-edit-order',
    
    // Direct order editing competitors (generic terms)
    'edit order', 'editorder', 'order-edit', 'orderedit',
    'modify order', 'modifyorder', 'order-modify', 'ordermodify',
    'change order', 'changeorder', 'order-change', 'orderchange',
    'update order', 'updateorder', 'order-update', 'orderupdate',
    'revise order', 'reviseorder', 'order-revise', 'orderrevise',
    'amend order', 'amendorder', 'order-amend', 'orderamend',
    'cancel order', 'cancelorder', 'order-cancel', 'ordercancel',
    
    // Previously known competitors
    'hulk', 'hulkcode', 'hulk code',
    'shoppad', 'shop pad',
    'orderlyemails', 'orderly emails', 'orderly-emails',
    'orderdesk', 'order desk', 'order-desk',
    'orderhive', 'order hive', 'order-hive',
    'ordermetrics', 'order metrics', 'order-metrics',
    'orderprinter', 'order printer', 'order-printer',
    'ordersify', 'orders-ify',
    'ordertify', 'order-tify',
    'editify', 'edit-ify',
    'modifyplus', 'modify plus', 'modify-plus',
    'changeplus', 'change plus', 'change-plus',
    'updateplus', 'update plus', 'update-plus',
    
    // Upselling competitors
    'cartboost', 'cart boost', 'cart-boost',
    'upsellify', 'upsell-ify',
    'crosssell', 'cross sell', 'cross-sell',
    'oneclick', 'one click', 'one-click',
    'clickfunnels', 'click funnels', 'click-funnels',
    'reconvert', 're-convert',
    'zipify', 'zip-ify',
    'honeycomb', 'honey comb', 'honey-comb',
    'rebuy', 're-buy',
    'bold', 'boldcommerce', 'bold commerce', 'bold-commerce',
    'vitals', 'vital', 'vitalsapp', 'vitals app', 'vitals-app',
    
    // Generic competitor terms
    'alternative', 'alternatives', 'competitor', 'competitors', 'competing',
    'better than', 'worse than', 'instead of', 'replacement for',
    'dont use', "don't use", 'avoid', 'stay away',
    
    // Negative business phrases
    'overpriced', 'expensive', 'costly', 'too much', 'rip off', 'ripoff',
    'buggy', 'broken', 'doesnt work', "doesn't work", 'not working',
    'slow', 'laggy', 'crashes', 'freezes', 'unreliable',
    'bad support', 'poor support', 'no help', 'unhelpful',
    'waste of money', 'waste money', 'not worth', 'worthless'
  ];

  // Combine all lists
  const allBadWords = [...profanityWords, ...competitors];

  // Generate variations for each word
  const expandedList: string[] = [];

  allBadWords.forEach(word => {
    if (!word || word.length < 2) return;
    
    // Add the original word
    expandedList.push(word);
    
    // Add common variations
    expandedList.push(`${word}s`);      // plurals
    expandedList.push(`${word}er`);     // noun forms  
    expandedList.push(`${word}ing`);    // gerund forms
    expandedList.push(`${word}ed`);     // past tense
    expandedList.push(`${word}y`);      // adjective forms
    
    // Add spacing variations
    expandedList.push(word.split('').join(' '));  // s p a c e d
    expandedList.push(word.split('').join('.'));  // d.o.t.t.e.d
    expandedList.push(word.split('').join('-'));  // d-a-s-h-e-d
    expandedList.push(word.split('').join('_'));  // u_n_d_e_r_s_c_o_r_e_d
    
    // Add leetspeak variations (safely)
    let leetWord = word.toLowerCase();
    leetWord = leetWord.replace(/a/g, '4');
    leetWord = leetWord.replace(/e/g, '3');
    leetWord = leetWord.replace(/i/g, '1');
    leetWord = leetWord.replace(/o/g, '0');
    leetWord = leetWord.replace(/s/g, '5');
    leetWord = leetWord.replace(/t/g, '7');
    if (leetWord !== word) {
      expandedList.push(leetWord);
    }
    
    // Add asterisk variations
    if (word.length > 3) {
      expandedList.push(word.charAt(0) + '*'.repeat(word.length - 2) + word.charAt(word.length - 1));
      expandedList.push(word.charAt(0) + word.charAt(1) + '*'.repeat(word.length - 2));
      expandedList.push('*'.repeat(word.length - 1) + word.charAt(word.length - 1));
    }
    
    // Add common character substitutions
    let substituted = word.toLowerCase();
    substituted = substituted.replace(/a/g, '@');
    substituted = substituted.replace(/i/g, '!');
    substituted = substituted.replace(/o/g, '0');
    substituted = substituted.replace(/s/g, '$');
    if (substituted !== word) {
      expandedList.push(substituted);
    }
  });
  
  // Remove duplicates and filter out safe words
  const uniqueList = [...new Set(expandedList)].filter(word => 
    word && 
    word.length >= 2 && 
    !safeWords.some(safe => 
      word.toLowerCase() === safe.toLowerCase() || 
      safe.toLowerCase() === word.toLowerCase()
    )
  );
  
  console.log(`[ProfanityList] Built comprehensive list with ${uniqueList.length} entries`);
  return uniqueList;
};

// Export the profanity list for use in the filter
export const PROFANE_WORDS = buildProfanityList(); 