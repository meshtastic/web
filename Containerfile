FROM nginx:1.27.2-alpine

RUN rm -r /usr/share/nginx/html \
 && mkdir /usr/share/nginx/html

WORKDIR /usr/share/nginx/html

ADD dist .

CMD nginx -g "daemon off;"