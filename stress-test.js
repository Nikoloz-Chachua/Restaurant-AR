import http from 'k6/http';
import { sleep, check } from 'k6';

const SUPABASE_URL = 'https://xctoxhaahxtcicfgnmme.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdG94aGFhaHh0Y2ljZmdubW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDMyMDEsImV4cCI6MjA5NTMxOTIwMX0.VA2tQL6WT96ifBjON4NLaJa0BbzBGI0ipD7iB5fHjnQ';

export const options = {
  stages: [
    { duration: '30s', target: 20  },  // ramp up to 20 concurrent users
    { duration: '1m',  target: 50  },  // hold at 50
    { duration: '30s', target: 100 },  // push to 100
    { duration: '30s', target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.05'],
  },
};

const HEADERS = {
  'apikey':        ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
};

export default function () {
  // Simulate a real user opening the menu
  const menuRes = http.get(
    `${SUPABASE_URL}/rest/v1/menu_items?select=*,categories(name_en,name_ka)&visible=eq.true&order=category_id,sort_order`,
    { headers: HEADERS, tags: { name: 'menu_fetch' } }
  );

  check(menuRes, {
    'menu status 200': r => r.status === 200,
    'menu has items':  r => r.json().length > 0,
  });

  sleep(1);

  // Simulate a user event insert (basket_add, item_view, etc.)
  http.post(
    `${SUPABASE_URL}/rest/v1/events`,
    JSON.stringify({
      session_id: `stress-test-${__VU}`,
      visitor_id: `stress-test-${__VU}`,
      event:      'item_view',
      item_name:  'Stress Test Item',
      category:   'Burgers',
      lang:       'en',
      ar_cap:     'none',
    }),
    {
      headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      tags: { name: 'event_insert' },
    }
  );

  sleep(1);
}
