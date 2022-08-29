'use strict';

/*
 * Constant values used by the scraper.js module.
 */

 const locationCookie = {
   name: 'aep_usuc_f',
   value: 'site=glo&c_tp=USD&x_alimid=3852065550&ups_d=1|1|1|1&isb=y&ups_u_t=1673513822387&region=US&b_locale=en_US&ae_u_p_s=2',
   domain: '.aliexpress.com'
 };

 const newUserBonusCookie = {
   name: 'xman_f',
   value: '93C8K8lzrDa/kn2XTH3NuFVGZmm88tesMfwSoIx0meNyrjiIsVH51j3tgrAB447oDOgJ7Nr37qHlnZ1G+WKG+87558slViUs4XSMv5/ZiTUtPZ79DBP6fz0Ju2YcLFwUEYkGyw+1L1678VhPAMMar9up1v+Mf/+C8h6uswNuYaXPVWkeQZL09R8CjQMYUMrS5xftX6l5uVoAX6ABsP0+cP4n8YyIXl4xWZ17dZ9PIg+w2d2KylfKKYQqOiemEuNMmC20ckvgNmd/c28SASRay0Ng0rzClPR5VtQxjsetbd70S2n+JQkSxxKH2izF0xtdvvL+IGCzBp11Bu6FWw70T2XVvQQMQXiasjVveURKJCRwHLBo938LFFdYFxnKpk94PXbY4k+xwvtdVaTDcmnZ6268cBr0fK1E+D61PAvLbCEQ+ytJ+dXRmREG209CGngXHNRCLbuw3wfSo9E6dZA4QgpsbsVeYAUpn5CCEa3grP4=',
   domain: '.aliexpress.com'
 };

 module.exports = {
   locationCookie: locationCookie,
   newUserBonusCookie: newUserBonusCookie
 };
