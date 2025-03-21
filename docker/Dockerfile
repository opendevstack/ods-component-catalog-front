FROM registry.access.redhat.com/ubi8/nginx-120

USER root

RUN yum update -y && \
    yum upgrade -y && \
    yum clean all

ADD dist/* /opt/app-root/src

RUN ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

CMD nginx -g "daemon off;"

USER 1001