FROM registry.access.redhat.com/ubi9/nginx-122:1-12

ADD dist .

CMD nginx -g "daemon off;"