import util

def main(argv):
    """
    Main function to install the standalone Kubernetes setup.
    """
    [name] = argv
    util.pr("uninstall standalone", name)
